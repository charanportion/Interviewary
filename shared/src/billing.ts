// Payments & credits protocol shared by the extension and the billing server.
//
// Two runtimes coexist:
//   - 'byok'   → the original serverless path: user's own Deepgram + LLM keys,
//                everything runs in the side panel, no credits consumed.
//   - 'server' → calls our billing server, which proxies the LLM with our keys
//                and mints a short-lived Deepgram key. Metered in credits where
//                1 credit = 1 interview minute.
//
// Access is gated by a Polar entitlement (lifetime or active subscription),
// resolved from a license key the user pastes in Settings.

export type AccountMode = 'byok' | 'server';

export type EntitlementStatus = 'lifetime' | 'subscription' | 'none';

export interface Entitlement {
  status: EntitlementStatus;
  // Remaining server-mode credits (interview minutes). Funded by the lifetime
  // free grant, subscription allotment, and top-ups — all on one Polar meter.
  creditsRemaining: number;
  // Raw Polar subscription status when status === 'subscription'
  // (e.g. 'active', 'canceled', 'past_due'). Undefined for lifetime/none.
  subscriptionStatus?: string;
}

// Polar products we sell. Maps to product ids configured on the server (env).
// Subscriptions (recurring) and lifetime (one-time) confer the app entitlement;
// top-ups only add credits.
export type ProductKind =
  | 'sub_starter'
  | 'sub_pro'
  | 'sub_team'
  | 'life_starter'
  | 'life_pro'
  | 'topup_small'
  | 'topup_medium'
  | 'topup_large';

// ───────── POST /v1/auth/resolve ─────────
// Exchange a pasted license key for an entitlement + a short-lived session token
// used to authenticate every other server call.
export interface ResolveRequest {
  licenseKey: string;
}
export interface ResolveResponse {
  ok: boolean;
  entitlement: Entitlement;
  sessionToken: string;
  customerId: string;
  // Present when ok === false (invalid/expired key, no entitlement, etc.).
  error?: string;
}

// ───────── GET /v1/me ─────────
export interface MeResponse {
  entitlement: Entitlement;
}

// ───────── POST /v1/session/start ─────────
// Begins a server-mode interview. Enforces entitlement + balance > 0, returns
// our Deepgram key (the extension connects DIRECTLY to Deepgram, preserving the
// latency budget), and the model ids the proxy serves for each role.
export interface StartSessionResponse {
  sessionId: string;
  deepgramKey: string;
  deepgramTtlSec: number;
  serverModel: { fast: string; report: string };
  creditsRemaining: number;
}

// ───────── POST /v1/session/heartbeat ─────────
// Sent ~every 60s during a server-mode interview. Ingests one interview-minute
// usage event to Polar and decrements the cached balance. `stop` flips true when
// the balance reaches 0 — the extension then surfaces CREDITS_EXHAUSTED.
export interface HeartbeatRequest {
  sessionId: string;
}
export interface HeartbeatResponse {
  creditsRemaining: number;
  stop: boolean;
}

// ───────── POST /v1/session/end ─────────
export interface EndSessionRequest {
  sessionId: string;
}
export interface EndSessionResponse {
  creditsRemaining: number;
}

// ───────── POST /v1/checkout ─────────
// Returns a Polar checkout URL the extension opens in a new tab. Passing the
// customer email/id unifies grants onto one Polar customer.
export interface CheckoutRequest {
  product: ProductKind;
  email?: string;
}
export interface CheckoutResponse {
  url: string;
}

// ───────── GET /v1/portal ─────────
export interface PortalResponse {
  url: string;
}

// ───────── POST /v1/subscription/cancel ─────────
// Cancels at period end — the user keeps access until the current period closes.
export interface CancelSubscriptionResponse {
  ok: boolean;
  cancelAtPeriodEnd: boolean;
  error?: string;
}
