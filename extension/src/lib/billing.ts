// Client for the billing server (server-mode + Polar entitlements). Mirrors the
// BYOK ethos: the user pastes a license key in Settings, we exchange it for a
// short-lived session token (kept in memory), and that token authenticates every
// other call. When no server URL is baked into the build, server mode is simply
// unavailable and the extension stays pure-BYOK.

import type {
  CancelSubscriptionResponse,
  CheckoutResponse,
  EndSessionResponse,
  HeartbeatResponse,
  MeResponse,
  PortalResponse,
  ProductKind,
  ResolveResponse,
  StartSessionResponse,
} from '@interview-copilot/shared';

const SERVER_URL = (import.meta.env.VITE_BILLING_SERVER_URL || '').trim().replace(/\/$/, '');

// Session token from the most recent resolve. Memory only — re-resolved from the
// stored license key on startup (see store.refreshEntitlement).
let sessionToken: string | null = null;

export function billingConfigured(): boolean {
  return SERVER_URL.length > 0;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function serverUrl(): string {
  return SERVER_URL;
}

function authHeaders(): Record<string, string> {
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
}

async function post<T>(path: string, body: unknown, auth = true): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? authHeaders() : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as T;
}

async function errorText(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string; message?: string };
    return j.message || j.error || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** Exchange a license key for an entitlement + session token. */
export async function resolveLicense(licenseKey: string): Promise<ResolveResponse> {
  if (!billingConfigured()) {
    return {
      ok: false,
      entitlement: { status: 'none', creditsRemaining: 0 },
      sessionToken: '',
      customerId: '',
      error: 'Billing server is not configured in this build.',
    };
  }
  const result = await post<ResolveResponse>('/v1/auth/resolve', { licenseKey }, false);
  sessionToken = result.ok ? result.sessionToken : null;
  return result;
}

export async function getMe(): Promise<MeResponse> {
  return get<MeResponse>('/v1/me');
}

export async function startServerSession(): Promise<StartSessionResponse> {
  return post<StartSessionResponse>('/v1/session/start', {});
}

export async function sessionHeartbeat(sessionId: string): Promise<HeartbeatResponse> {
  return post<HeartbeatResponse>('/v1/session/heartbeat', { sessionId });
}

export async function endServerSession(sessionId: string): Promise<EndSessionResponse> {
  return post<EndSessionResponse>('/v1/session/end', { sessionId });
}

// Authenticated checkout: sends the session token so the server binds the
// checkout to this customer (used for in-app top-ups, so credits land on the
// right account). Anonymous first-time purchases happen on the landing page.
export async function createCheckout(product: ProductKind, email?: string): Promise<string> {
  const { url } = await post<CheckoutResponse>('/v1/checkout', { product, email }, true);
  return url;
}

export async function openPortal(): Promise<string> {
  const { url } = await get<PortalResponse>('/v1/portal');
  return url;
}

export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  return post<CancelSubscriptionResponse>('/v1/subscription/cancel', {});
}
