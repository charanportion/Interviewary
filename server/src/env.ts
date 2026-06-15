// Centralized environment config. Reads process.env once and exposes a typed
// object. Missing-but-required values throw at startup; optional values warn so
// the server still boots in partial-config dev setups.

import 'node:process';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function opt(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: num('PORT', 8787),
  // Explicit allowlist of web origins (the landing site). Empty by default — the
  // CORS layer additionally always allows chrome-extension:// origins (the side
  // panel). Do NOT set this to '*'. e.g. ALLOWED_ORIGINS=http://localhost:3000,https://interviewary.dotportion.com
  allowedOrigins: opt('ALLOWED_ORIGINS', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  databaseUrl: req('DATABASE_URL'),

  jwtSecret: req('JWT_SECRET'),
  sessionTokenTtlSec: num('SESSION_TOKEN_TTL_SEC', 3600),

  polar: {
    server: (opt('POLAR_SERVER', 'sandbox') === 'production' ? 'production' : 'sandbox') as
      | 'sandbox'
      | 'production',
    // Optional at boot so the server can start (and /health + the BYOK path work)
    // before Polar is configured. Polar calls just fail gracefully until set.
    accessToken: opt('POLAR_ACCESS_TOKEN'),
    organizationId: opt('POLAR_ORGANIZATION_ID'),
    webhookSecret: opt('POLAR_WEBHOOK_SECRET'),
    products: {
      sub_starter: opt('POLAR_PRODUCT_SUB_STARTER'),
      sub_pro: opt('POLAR_PRODUCT_SUB_PRO'),
      sub_team: opt('POLAR_PRODUCT_SUB_TEAM'),
      life_starter: opt('POLAR_PRODUCT_LIFE_STARTER'),
      life_pro: opt('POLAR_PRODUCT_LIFE_PRO'),
      topup_small: opt('POLAR_PRODUCT_TOPUP_SMALL'),
      topup_medium: opt('POLAR_PRODUCT_TOPUP_MEDIUM'),
      topup_large: opt('POLAR_PRODUCT_TOPUP_LARGE'),
    } as Record<string, string>,
    meterId: opt('POLAR_METER_ID'),
    eventName: opt('POLAR_EVENT_NAME', 'interview_minute'),
    successUrl: opt('POLAR_SUCCESS_URL', 'https://interviewary.dotportion.com/checkout/success'),
  },

  deepgram: {
    // Single standard Deepgram API key. In server mode we hand this to the
    // extension so it connects to Deepgram directly (same as BYOK). A standard
    // key can't mint scoped sub-keys — that would need an admin (keys:write) key.
    apiKey: opt('DEEPGRAM_API_KEY'),
  },

  // Server-mode LLM = Anthropic (Claude). The proxy forwards to this upstream and
  // injects the real key; the extension's server-mode model is createAnthropic().
  llm: {
    apiKey: opt('ANTHROPIC_API_KEY'),
    baseUrl: opt('ANTHROPIC_BASE_URL', 'https://api.anthropic.com/v1').replace(/\/$/, ''),
    anthropicVersion: opt('ANTHROPIC_VERSION', '2023-06-01'),
    fastModel: opt('SERVER_MODEL_FAST', 'claude-haiku-4-5'),
    reportModel: opt('SERVER_MODEL_REPORT', 'claude-sonnet-4-6'),
  },
};

export type Env = typeof env;
