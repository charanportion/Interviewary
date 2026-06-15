// Polar (Merchant of Record) integration. Polar is the source of truth for
// entitlements and credit grants; we cache into Postgres for fast enforcement.
//
// NOTE: Polar ingests usage events regardless of balance and never blocks on it
// (per their docs) — so credit enforcement lives in OUR server (see routes).
//
// SDK shapes occasionally shift between versions; access is defensive. Verify
// field names against the installed @polar-sh/sdk if a call 404s/throws.

import { Polar } from '@polar-sh/sdk';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { env } from './env.ts';
import type { Entitlement, EntitlementStatus, ProductKind } from '@interview-copilot/shared';

export const polar = new Polar({
  accessToken: env.polar.accessToken,
  server: env.polar.server,
});

export { WebhookVerificationError };

export interface ResolvedCustomer {
  customerId: string;
  email: string | null;
  entitlement: Entitlement;
}

/** Sum the balance of the interview-minute meter (or all meters if unconfigured). */
function meterBalance(state: any): number {
  const meters: any[] = state?.activeMeters ?? state?.active_meters ?? [];
  if (!Array.isArray(meters) || meters.length === 0) return 0;
  const match = env.polar.meterId
    ? meters.filter((m) => (m.meterId ?? m.meter_id) === env.polar.meterId)
    : meters;
  const list = match.length > 0 ? match : meters;
  return list.reduce((sum, m) => sum + Number(m.balance ?? 0), 0);
}

function deriveEntitlement(state: any, hasValidLicense: boolean): Entitlement {
  const subs: any[] = state?.activeSubscriptions ?? state?.active_subscriptions ?? [];
  const activeSub = subs.find((s) =>
    ['active', 'trialing'].includes(String(s.status ?? '').toLowerCase()),
  );
  const creditsRemaining = Math.max(0, Math.floor(meterBalance(state)));

  if (activeSub) {
    return { status: 'subscription', creditsRemaining, subscriptionStatus: String(activeSub.status) };
  }
  // A granted license key with no active subscription means they bought lifetime.
  const status: EntitlementStatus = hasValidLicense ? 'lifetime' : 'none';
  return { status, creditsRemaining };
}

/**
 * Validate a pasted license key, resolve the customer, and derive entitlement
 * + credit balance from Polar customer state.
 */
export async function resolveByLicenseKey(licenseKey: string): Promise<ResolvedCustomer | null> {
  let validation: any;
  try {
    validation = await polar.licenseKeys.validate({
      key: licenseKey.trim(),
      organizationId: env.polar.organizationId,
    });
  } catch {
    return null; // invalid / expired / unknown key
  }

  const status = String(validation?.status ?? '').toLowerCase();
  const valid = status === 'granted' || status === 'active' || validation?.valid === true;
  const customerId: string | undefined = validation?.customer?.id ?? validation?.customerId;
  if (!valid || !customerId) return null;

  const email: string | null = validation?.customer?.email ?? null;
  const state = await getCustomerState(customerId);
  const entitlement = deriveEntitlement(state, true);
  return { customerId, email, entitlement };
}

export async function getCustomerState(customerId: string): Promise<any> {
  try {
    return await polar.customers.getState({ id: customerId });
  } catch {
    return null;
  }
}

/**
 * Recompute entitlement for a known customer (used by webhooks). Conservative:
 * reports 'subscription' (active sub) or 'none', plus the current credit balance.
 * Lifetime is applied by the webhook handler's stickiness logic, since we can't
 * re-validate the license key here.
 */
export async function refreshEntitlement(customerId: string): Promise<Entitlement> {
  const state = await getCustomerState(customerId);
  return deriveEntitlement(state, false);
}

/** Ingest `minutes` interview-minute usage events for a customer. */
export async function ingestMinutes(customerId: string, sessionId: string, minutes: number): Promise<void> {
  if (minutes <= 0) return;
  const events = Array.from({ length: minutes }, () => ({
    name: env.polar.eventName,
    customerId,
    metadata: { session_id: sessionId, units: 1 },
  }));
  await polar.events.ingest({ events });
}

export async function createCheckout(
  product: ProductKind,
  opts: { email?: string; customerId?: string } = {},
): Promise<string> {
  const productId = env.polar.products[product];
  if (!productId) throw new Error(`No Polar product id configured for "${product}"`);

  // Tell the success page which build to offer: lifetime / subscription / topup.
  const edition = product.startsWith('life')
    ? 'lifetime'
    : product.startsWith('sub')
      ? 'subscription'
      : 'topup';
  const success = new URL(env.polar.successUrl);
  success.searchParams.set('edition', edition);
  // Back-button target on the hosted checkout (same origin as the success page).
  const returnUrl = new URL('/checkout/canceled', env.polar.successUrl).toString();

  // Bind to the existing customer when we know them (top-ups from an activated
  // user) so credits always land on the right account, regardless of typed email.
  const checkout: any = await polar.checkouts.create({
    products: [productId],
    successUrl: success.toString(),
    returnUrl,
    ...(opts.customerId ? { customerId: opts.customerId } : opts.email ? { customerEmail: opts.email } : {}),
  } as any);
  const url: string | undefined = checkout?.url;
  if (!url) throw new Error('Polar checkout did not return a url');
  return url;
}

/** The customer's current active/trialing subscription id, if any. */
export async function activeSubscriptionId(customerId: string): Promise<string | null> {
  const state = await getCustomerState(customerId);
  const subs: any[] = state?.activeSubscriptions ?? state?.active_subscriptions ?? [];
  const active = subs.find((s) =>
    ['active', 'trialing'].includes(String(s.status ?? '').toLowerCase()),
  );
  return active?.id ?? subs[0]?.id ?? null;
}

/** Cancel a subscription at the end of the current period (keeps access until then). */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<void> {
  await polar.subscriptions.update({
    id: subscriptionId,
    subscriptionUpdate: { cancelAtPeriodEnd: true },
  } as any);
}

export async function createPortalUrl(customerId: string): Promise<string> {
  const session: any = await polar.customerSessions.create({ customerId });
  const url: string | undefined = session?.customerPortalUrl ?? session?.customer_portal_url;
  if (!url) throw new Error('Polar did not return a customer portal url');
  return url;
}

export interface ParsedWebhook {
  id: string;
  type: string;
  data: any;
}

/** Verify signature and parse a Polar webhook. Throws WebhookVerificationError. */
export function parseWebhook(body: string, headers: Record<string, string>): ParsedWebhook {
  const event = validateEvent(body, headers, env.polar.webhookSecret) as any;
  return { id: event?.id ?? event?.data?.id ?? '', type: event?.type, data: event?.data };
}

/** Which entitlement a paid product confers (used by webhook handlers). */
export function productEntitlement(productId: string | undefined): EntitlementStatus | null {
  if (!productId) return null;
  const p = env.polar.products;
  const lifetime = [p.life_starter, p.life_pro].filter(Boolean);
  const subscription = [p.sub_starter, p.sub_pro, p.sub_team].filter(Boolean);
  if (lifetime.includes(productId)) return 'lifetime';
  if (subscription.includes(productId)) return 'subscription';
  return null; // top-ups don't change entitlement, only credits
}
