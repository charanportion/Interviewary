// Billing server for the Interviewary extension.
//
// Responsibilities:
//   - Resolve a Polar license key → entitlement + short-lived session token
//   - Enforce credit balance for server-mode interviews (Polar won't block; we do)
//   - Mint scoped Deepgram keys so the extension connects to Deepgram directly
//   - Proxy the LLM with our upstream key, metered in interview minutes
//   - Create Polar checkouts / customer-portal links and process webhooks
//
// Run: pnpm --filter @interview-copilot/server dev   (after copying .env.example → .env)

import 'dotenv/config'; // load server/.env before env.ts reads process.env
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import { env } from './env.ts';
import { corsMiddleware, securityHeaders, maxBody, fail } from './security.ts';
import { rateLimit, clientIp } from './ratelimit.ts';
import { bearer, issueSessionToken, verifySessionToken, type SessionClaims } from './auth.ts';
import {
  resolveByLicenseKey,
  refreshEntitlement,
  ingestMinutes,
  createCheckout,
  createPortalUrl,
  activeSubscriptionId,
  cancelSubscriptionAtPeriodEnd,
  getCustomerState,
  parseWebhook,
  productEntitlement,
  WebhookVerificationError,
} from './polar.ts';
import { getSessionDeepgramKey } from './deepgram.ts';
import {
  upsertCustomer,
  getCustomer,
  mapLicenseKey,
  customerIdForLicenseKey,
  hashLicenseKey,
  decrementCredits,
  createSession,
  getSession,
  bumpSessionMinutes,
  endSession,
  recordUsage,
  claimWebhookEvent,
  unclaimWebhookEvent,
} from './db.ts';
import { randomUUID } from 'node:crypto';
import type {
  ResolveResponse,
  MeResponse,
  StartSessionResponse,
  HeartbeatResponse,
  EndSessionResponse,
  CheckoutResponse,
  PortalResponse,
  CancelSubscriptionResponse,
  ProductKind,
} from '@interview-copilot/shared';

type Vars = { claims: SessionClaims };
const app = new Hono<{ Variables: Vars }>();

// Global middleware: security headers, strict CORS, and a hard body-size cap
// (2MB — comfortably covers LLM prompts, blocks memory-exhaustion payloads).
app.use('*', securityHeaders);
app.use('*', corsMiddleware());
app.use('*', maxBody(2 * 1024 * 1024));

// Per-route rate limiters (in-memory, single-instance).
const rlResolve = rateLimit({ name: 'resolve', windowMs: 60_000, max: 10 }); // license-key brute-force
const rlCheckout = rateLimit({ name: 'checkout', windowMs: 60_000, max: 10 });
const rlSession = rateLimit({ name: 'session', windowMs: 60_000, max: 120 });
const rlLlm = rateLimit({
  name: 'llm',
  windowMs: 60_000,
  max: 60,
  key: (c) => c.req.header('x-session-id') ?? clientIp(c),
});

// Upper bound on tokens the metered proxy will request from Anthropic per call.
const MAX_OUTPUT_TOKENS = 16384;

app.get('/health', (c) => c.json({ ok: true }));

// ───────── Auth: resolve a license key ─────────
const resolveSchema = z.object({ licenseKey: z.string().min(1) });

app.post('/v1/auth/resolve', rlResolve, async (c) => {
  const parsed = resolveSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ ok: false, error: 'licenseKey required' }, 400);

  const resolved = await resolveByLicenseKey(parsed.data.licenseKey);
  if (!resolved || resolved.entitlement.status === 'none') {
    const body: ResolveResponse = {
      ok: false,
      entitlement: { status: 'none', creditsRemaining: 0 },
      sessionToken: '',
      customerId: '',
      error: 'License key is not valid or has no active entitlement.',
    };
    return c.json(body, 200);
  }

  // Webhooks set entitlement from the *actual product purchased* (life_* → lifetime,
  // sub_* → subscription), which is authoritative. Our license-key benefit is shared
  // across lifetime + subscription, so live inference alone can't always tell them
  // apart — so prefer the webhook-sourced DB status when we have it, and only fall
  // back to the inferred status for a cold start (webhook not processed yet).
  const existing = await getCustomer(resolved.customerId);
  const status =
    existing && existing.entitlement !== 'none' ? existing.entitlement : resolved.entitlement.status;
  const entitlement = { ...resolved.entitlement, status };

  // Cache the customer + key mapping for fast subsequent lookups.
  await upsertCustomer({
    polarCustomerId: resolved.customerId,
    email: resolved.email,
    entitlement: entitlement.status,
    subscriptionStatus: entitlement.subscriptionStatus ?? null,
    creditsCached: entitlement.creditsRemaining,
  });
  await mapLicenseKey(hashLicenseKey(parsed.data.licenseKey), resolved.customerId);

  const sessionToken = await issueSessionToken({
    customerId: resolved.customerId,
    entitlement: entitlement.status,
  });

  const body: ResolveResponse = {
    ok: true,
    entitlement,
    sessionToken,
    customerId: resolved.customerId,
  };
  return c.json(body);
});

// ───────── Session-token guard ─────────
async function requireSession(c: any, next: () => Promise<void>) {
  const token = bearer(c.req.header('authorization'));
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) return c.json({ error: 'unauthorized' }, 401);
  c.set('claims', claims);
  await next();
}

// ───────── Me: entitlement + credit balance (from cache) ─────────
app.get('/v1/me', requireSession, async (c) => {
  const { customerId } = c.get('claims');
  const customer = await getCustomer(customerId);
  const body: MeResponse = {
    entitlement: {
      status: customer?.entitlement ?? 'none',
      creditsRemaining: customer?.credits_cached ?? 0,
      subscriptionStatus: customer?.subscription_status ?? undefined,
    },
  };
  return c.json(body);
});

// ───────── Start a server-mode interview ─────────
app.post('/v1/session/start', rlSession, requireSession, async (c) => {
  const { customerId, entitlement } = c.get('claims');
  if (entitlement === 'none') return c.json({ error: 'no entitlement' }, 403);

  const customer = await getCustomer(customerId);
  if (!customer || customer.credits_cached <= 0) {
    return c.json({ error: 'no_credits', message: 'Out of credits. Top up or use your own keys.' }, 402);
  }

  const sessionId = randomUUID();
  await createSession(sessionId, customerId);

  let deepgramKey: string;
  let ttlSec: number;
  try {
    const k = getSessionDeepgramKey();
    deepgramKey = k.key;
    ttlSec = k.ttlSec;
  } catch (err) {
    await endSession(sessionId, 'stopped');
    console.error('[session/start] deepgram', err);
    return c.json({ error: 'deepgram_unavailable', message: 'Transcription is temporarily unavailable.' }, 502);
  }

  const body: StartSessionResponse = {
    sessionId,
    deepgramKey,
    deepgramTtlSec: ttlSec,
    serverModel: { fast: env.llm.fastModel, report: env.llm.reportModel },
    creditsRemaining: customer.credits_cached,
  };
  return c.json(body);
});

// ───────── Heartbeat: meter one interview minute ─────────
const heartbeatSchema = z.object({ sessionId: z.string().uuid() });

app.post('/v1/session/heartbeat', rlSession, requireSession, async (c) => {
  const { customerId } = c.get('claims');
  const parsed = heartbeatSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'sessionId required' }, 400);

  const session = await getSession(parsed.data.sessionId);
  if (!session || session.polar_customer_id !== customerId) {
    return c.json({ error: 'unknown session' }, 404);
  }
  if (session.status !== 'active') {
    return c.json({ creditsRemaining: 0, stop: true } satisfies HeartbeatResponse);
  }

  // Meter one minute: ingest to Polar (source of truth) + decrement local cache.
  await ingestMinutes(customerId, session.id, 1).catch(() => {
    /* ingestion failures shouldn't block the interview; ledger marks not-ingested */
  });
  await bumpSessionMinutes(session.id, 1);
  await recordUsage({ polarCustomerId: customerId, sessionId: session.id, minutes: 1, ingested: true });
  const creditsRemaining = await decrementCredits(customerId, 1);

  const stop = creditsRemaining <= 0;
  if (stop) await endSession(session.id, 'stopped');

  return c.json({ creditsRemaining, stop } satisfies HeartbeatResponse);
});

// ───────── End a server-mode interview ─────────
const endSchema = z.object({ sessionId: z.string().uuid() });

app.post('/v1/session/end', requireSession, async (c) => {
  const { customerId } = c.get('claims');
  const parsed = endSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'sessionId required' }, 400);

  const session = await getSession(parsed.data.sessionId);
  if (session && session.polar_customer_id === customerId && session.status === 'active') {
    await endSession(session.id, 'ended');
  }
  const customer = await getCustomer(customerId);
  return c.json({ creditsRemaining: customer?.credits_cached ?? 0 } satisfies EndSessionResponse);
});

// ───────── Checkout (no session required — used pre-purchase from the paywall) ─────────
const checkoutSchema = z.object({
  product: z.enum([
    'sub_starter',
    'sub_pro',
    'sub_team',
    'life_starter',
    'life_pro',
    'topup_small',
    'topup_medium',
    'topup_large',
  ]),
  email: z.string().email().optional(),
});

app.post('/v1/checkout', rlCheckout, async (c) => {
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid product' }, 400);

  // If the caller is an activated user (valid session token), bind the checkout to
  // their Polar customer so top-ups credit the right account. First-time
  // sub/lifetime buyers are anonymous (no token) and fall back to email.
  const token = bearer(c.req.header('authorization'));
  const claims = token ? await verifySessionToken(token) : null;

  // Buyer IP drives Polar's local-currency selection. The extension calls us
  // directly (its request IP is the buyer's), so clientIp works. The landing calls
  // us server-to-server and forwards the visitor's IP as x-customer-ip.
  const fwd = c.req.header('x-customer-ip');
  const customerIp = fwd ? fwd.split(',')[0]!.trim() : clientIp(c);

  try {
    const url = await createCheckout(parsed.data.product as ProductKind, {
      email: parsed.data.email,
      customerId: claims?.customerId,
      customerIp: customerIp && customerIp !== 'unknown' ? customerIp : undefined,
    });
    return c.json({ url } satisfies CheckoutResponse);
  } catch (err) {
    return fail(c, 'checkout', err);
  }
});

// ───────── Customer portal ─────────
app.get('/v1/portal', requireSession, async (c) => {
  const { customerId } = c.get('claims');
  try {
    const url = await createPortalUrl(customerId);
    return c.json({ url } satisfies PortalResponse);
  } catch (err) {
    return fail(c, 'portal', err);
  }
});

// ───────── Cancel subscription (at period end) ─────────
app.post('/v1/subscription/cancel', requireSession, async (c) => {
  const { customerId } = c.get('claims');
  try {
    const subId = await activeSubscriptionId(customerId);
    if (!subId) {
      return c.json(
        { ok: false, cancelAtPeriodEnd: false, error: 'No active subscription found.' } satisfies CancelSubscriptionResponse,
        404,
      );
    }
    await cancelSubscriptionAtPeriodEnd(subId);
    // Webhook (subscription.updated) will sync the cache; access stays until period end.
    return c.json({ ok: true, cancelAtPeriodEnd: true } satisfies CancelSubscriptionResponse);
  } catch (err) {
    console.error('[subscription/cancel]', err);
    return c.json(
      { ok: false, cancelAtPeriodEnd: false, error: 'Could not cancel right now. Please try again.' } satisfies CancelSubscriptionResponse,
      502,
    );
  }
});

// ───────── LLM proxy (Anthropic Messages, metered + locked down) ─────────
// The extension points the AI SDK's Anthropic provider at {SERVER}/v1/llm with
// the session token as its apiKey — Anthropic's SDK sends that as `x-api-key`.
// We verify it, enforce credits, pin the model + clamp output, swap in our real
// Anthropic key, and stream the response straight through to /v1/messages.
//
// Hardening: POST + /messages ONLY (no other Anthropic endpoints), model must be
// one we serve, and max_tokens is clamped — so our key can't be used as a general
// or oversized Claude API even by an authenticated client.
app.post('/v1/llm/*', rlLlm, async (c) => {
  const rest = c.req.path.replace(/^\/v1\/llm/, '');
  if (rest !== '/messages') return c.json({ error: 'endpoint_not_allowed' }, 403);

  // Anthropic SDK auth header is x-api-key; fall back to bearer just in case.
  const token = c.req.header('x-api-key') ?? bearer(c.req.header('authorization'));
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) return c.json({ error: 'unauthorized' }, 401);

  const sessionId = c.req.header('x-session-id');
  if (sessionId) {
    const session = await getSession(sessionId);
    if (!session || session.polar_customer_id !== claims.customerId || session.status !== 'active') {
      return c.json({ error: 'session inactive' }, 402);
    }
  }
  const customer = await getCustomer(claims.customerId);
  if (!customer || customer.credits_cached <= 0) {
    return c.json({ error: 'no_credits' }, 402);
  }

  let payload: any;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_body' }, 400);
  }
  const allowedModels = new Set([env.llm.fastModel, env.llm.reportModel]);
  if (typeof payload?.model !== 'string' || !allowedModels.has(payload.model)) {
    return c.json({ error: 'model_not_allowed' }, 403);
  }
  payload.max_tokens =
    typeof payload.max_tokens === 'number'
      ? Math.min(payload.max_tokens, MAX_OUTPUT_TOKENS)
      : MAX_OUTPUT_TOKENS;

  const headers = new Headers();
  headers.set('content-type', 'application/json');
  const accept = c.req.header('accept');
  if (accept) headers.set('accept', accept);
  headers.set('x-api-key', env.llm.apiKey);
  headers.set('anthropic-version', c.req.header('anthropic-version') ?? env.llm.anthropicVersion);
  const beta = c.req.header('anthropic-beta');
  if (beta) headers.set('anthropic-beta', beta);

  let upstream: Response;
  try {
    upstream = await fetch(`${env.llm.baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return fail(c, 'llm-proxy', err);
  }

  const respHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) respHeaders.set('content-type', ct);
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
});

// ───────── Polar webhooks ─────────
app.post('/webhooks/polar', async (c) => {
  const body = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });

  let event;
  try {
    event = parseWebhook(body, headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) return c.json({ error: 'bad signature' }, 403);
    return c.json({ error: 'invalid payload' }, 400);
  }

  // Idempotency: skip if we've already processed this delivery.
  if (event.id) {
    const fresh = await claimWebhookEvent(event.id, event.type);
    if (!fresh) return c.json({ ok: true, deduped: true });
  }

  // Process AFTER claiming (claim is the dedupe guard). If the sync fails, return
  // 500 so Polar retries — but the claim row blocks a duplicate apply, and our
  // upserts are idempotent, so a retry safely re-runs the sync. We unclaim on
  // failure so the retry isn't deduped away.
  try {
    await syncCustomerFromEvent(event.type, event.data);
  } catch (err) {
    console.error('[webhook] sync failed, asking Polar to retry:', event.type, err);
    if (event.id) await unclaimWebhookEvent(event.id).catch(() => {});
    return c.json({ error: 'sync_failed' }, 500);
  }

  return c.json({ ok: true });
});

async function syncCustomerFromEvent(type: string, data: any): Promise<void> {
  const customerId: string | undefined =
    data?.customer?.id ?? data?.customerId ?? data?.customer_id ?? data?.subscription?.customerId;
  if (!customerId) return;

  const ent = await refreshEntitlement(customerId); // conservative: subscription | none (+ credits)
  const existing = await getCustomer(customerId);
  const productId: string | undefined = data?.productId ?? data?.product?.id ?? data?.product_id;

  // Lifetime is sticky: granted by a lifetime order and never downgraded by a
  // subscription/credit event.
  let entitlement = ent.status;
  if (productEntitlement(productId) === 'lifetime') entitlement = 'lifetime';
  else if (existing?.entitlement === 'lifetime' && ent.status !== 'subscription') entitlement = 'lifetime';

  // Pull a fresh credit balance from customer state regardless of event shape.
  await getCustomerState(customerId); // (already fetched inside refreshEntitlement; cheap re-read tolerated)

  await upsertCustomer({
    polarCustomerId: customerId,
    email: data?.customer?.email ?? null,
    entitlement,
    subscriptionStatus: ent.subscriptionStatus ?? null,
    creditsCached: ent.creditsRemaining,
  });
}

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[server] billing server listening on :${info.port} (polar: ${env.polar.server})`);
});

export { app };
