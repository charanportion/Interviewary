// Build edition. We ship two distributable builds:
//   - 'lifetime'     → BYOK (own keys) available, plus server credits.
//   - 'subscription' → credits only; BYOK is omitted entirely.
//
// Set at build time via VITE_EDITION (see package-extension.mjs, which produces
// one zip per edition). Defaults to 'lifetime' (the superset) for dev.
//
// IMPORTANT: the build flag only controls packaging + UI. The *real* enforcement
// is the runtime entitlement — BYOK is allowed only for a 'lifetime' entitlement
// (see byokAvailable in the store). So a subscription license never unlocks BYOK,
// even in the lifetime build.

export type Edition = 'lifetime' | 'subscription';

export const EDITION: Edition =
  import.meta.env.VITE_EDITION === 'subscription' ? 'subscription' : 'lifetime';

/** Does this build include the BYOK UI at all? (Subscription build does not.) */
export const BYOK_BUILD = EDITION !== 'subscription';
