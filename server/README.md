# Interviewary Billing Server

The serverless extension stays BYO-key and free *to run*, but access is now gated
behind a **Polar** purchase. This small **Hono (Node)** server adds the paid path:

- **Lifetime (BYOK)** — one-time purchase. Unlocks the extension forever (own keys),
  plus **N free server credits** to try server mode.
- **Subscription (credits)** — recurring. Unlocks the extension + a monthly credit
  allotment used in **server mode** (our Deepgram + LLM keys).
- **Top-ups** — one-time credit packs for anyone.

**1 credit = 1 interview minute.** Polar is the source of truth for entitlements and
credit grants; this server caches them in **Supabase Postgres** and **enforces** the
balance (Polar ingests usage but never blocks on balance).

## Architecture

```
Extension (side panel)
  │  paste license key ─────────────► POST /v1/auth/resolve ──► Polar validate + customer state
  │  ◄── { entitlement, creditsRemaining, sessionToken }
  │
  │  server-mode interview:
  │   POST /v1/session/start ──► returns our Deepgram key + model ids
  │   ── connects DIRECTLY to Deepgram with that key (no audio through us) ──►
  │   LLM agents ──► POST /v1/llm/* (Anthropic proxy, our key) ──► api.anthropic.com
  │   every 60s: POST /v1/session/heartbeat ──► ingest 1 minute to Polar + decrement cache
  │   POST /v1/session/end
  │
Polar ──► POST /webhooks/polar (order.paid, subscription.*, benefit_grant.*) ──► refresh cache
```

The real-time Deepgram path is **not** tunneled through this server — `/v1/session/start`
returns our Deepgram API key and the extension connects to Deepgram directly, so the
2-second latency budget is preserved. (A standard key can't mint scoped sub-keys; using an
admin `keys:write` key to issue short-TTL per-session keys is the production hardening.) Only the LLM
agents (which already have a 2s budget and stream) go through our proxy.

## Stack

- Hono + `@hono/node-server`
- `@polar-sh/sdk` (license validation, checkout, customer state, usage ingestion, webhooks)
- Supabase Postgres via the `postgres` package (shares the project the landing site uses)
- `jose` for short-lived session tokens

## Setup

### 1. Install + env

```bash
pnpm install
cp server/.env.example server/.env   # then fill it in (see below)
```

### 2. Supabase database

Use the same Supabase project as the landing site. Copy its Postgres connection string
(Dashboard → Project Settings → Database → Connection string → **Transaction pooler**,
port 6543) into `DATABASE_URL`, then:

```bash
pnpm --filter @interview-copilot/server db:init
```

(or paste `server/src/schema.sql` into the Supabase SQL editor.)

> The billing tables (`customers`, `license_keys`, `sessions`, `usage_ledger`,
> `webhook_events`) are namespaced separately from the landing's analytics/leads tables,
> so they coexist safely in one Supabase project.

### 3. Polar dashboard (use the **Sandbox** environment for dev)

1. **Organization access token** → `POLAR_ACCESS_TOKEN`; org id → `POLAR_ORGANIZATION_ID`.
2. **Meter** named e.g. `Interview minutes`: event name `interview_minute`, aggregation
   **count** of events (the server ingests one event per minute). Put its id in `POLAR_METER_ID`.
3. **Products** — run the bootstrap script, which creates the license-key + meter-credit
   benefits and all eight products (3 subscription tiers, 2 lifetime tiers, 3 top-ups),
   attaches benefits, and writes the product ids into `.env`:

   ```bash
   pnpm --filter @interview-copilot/server polar:setup
   ```

   Subscriptions + lifetime get a **License Key** + **Meter Credit** benefit; top-ups get
   **Meter Credit** only. Prices/credits live in `src/scripts/setupPolar.ts` (edit there or in
   the dashboard). Plans + pricing:

   | Plan | Type | Price | Credits |
   |---|---|---|---|
   | Subscription Starter | monthly | ₹699 | 250/mo |
   | Subscription Pro | monthly | ₹1,999 | 800/mo |
   | Subscription Team | monthly | ₹4,999 | 2,500/mo |
   | Lifetime Starter | one-time | ₹2,499 | 200 + BYOK |
   | Lifetime Pro | one-time | ₹6,999 | 1,000 + BYOK |
   | Top-up Small / Medium / Large | one-time | ₹399 / ₹1,799 / ₹5,999 | 100 / 500 / 2,000 |

   (The extension's display catalog mirrors these in `extension/src/lib/plans.ts` — keep in sync.)
4. **Webhook** → `https://<your-server>/webhooks/polar`, secret → `POLAR_WEBHOOK_SECRET`.
   Subscribe to `order.paid`, `subscription.active`, `subscription.updated`,
   `subscription.canceled`, `subscription.revoked`, `benefit_grant.created`,
   `benefit_grant.revoked`. (The handler re-syncs from live customer state on any of
   these, so the cache stays correct through cancel / lapse / renewal.)
5. **Deepgram**: a standard API key (`DEEPGRAM_API_KEY`) — handed to the extension in server mode.
6. **Server-mode LLM**: `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_BASE_URL`, model ids).

### 4. Run

```bash
pnpm --filter @interview-copilot/server dev      # http://localhost:8787
```

For local webhook testing, expose the port with a tunnel (e.g. `ngrok http 8787`)
and register that URL in Polar.

### 5. Point the extension at it

Build the extension with `VITE_BILLING_SERVER_URL` set to this server's origin
(see `extension/.env.example`).

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/auth/resolve` | — | license key → entitlement + session token |
| GET | `/v1/me` | session | cached entitlement + credit balance |
| POST | `/v1/session/start` | session | start server-mode interview, return Deepgram key |
| POST | `/v1/session/heartbeat` | session | meter 1 minute, decrement credits, `stop` at 0 |
| POST | `/v1/session/end` | session | finalize session |
| ALL | `/v1/llm/*` | session (as x-api-key) | metered Anthropic LLM proxy |
| POST | `/v1/checkout` | — | create a Polar checkout URL |
| GET | `/v1/portal` | session | Polar customer-portal URL |
| POST | `/webhooks/polar` | signature | sync entitlements + credit grants |

## Notes / known assumptions

- **Credit enforcement** is local (cached balance + heartbeat). Polar's meter is the
  long-term source of truth; `/v1/auth/resolve` and webhooks re-sync the cache.
- **Lifetime is sticky**: once set (license validated / lifetime order), subscription
  or credit events never downgrade it.
- Some `@polar-sh/sdk` response field names vary by version; `polar.ts` accesses them
  defensively — adjust if a call shape differs in your installed version.
- Server-mode runs on Anthropic (Claude); the `/v1/llm/*` proxy is a thin passthrough
  to `api.anthropic.com` that injects our key (`x-api-key`) + `anthropic-version`.
  Model ids come from `SERVER_MODEL_FAST` / `SERVER_MODEL_REPORT`.
