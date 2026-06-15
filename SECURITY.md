# Security

Posture and operational checklist for the payments + app flow. Companion to the
hardening work in `server/`, `extension/`, and `landing/`.

## Trust model (where enforcement lives)
- **Supabase billing tables** are reached ONLY via the billing server's **direct
  Postgres connection** (table-owner role). They have **RLS enabled with no policies**
  + `anon`/`authenticated` revoked, so the public Data API exposes nothing. Apply with
  `server/src/lockdown.sql` (Supabase SQL editor); fresh installs get it from `schema.sql`.
- **Credits/entitlement are enforced server-side** (session start, LLM proxy, heartbeat).
  The extension's checks are UX only.
- **Session tokens** are short-lived (`jose` HS256, 1h) and re-validated every request;
  the entitlement claim is not trusted for authorization (the server re-reads the DB).
- **Webhooks** are signature-verified (raw body) and idempotent; failures return 500 so
  Polar retries.
- **LLM proxy** (`/v1/llm/*`) is POST + `/messages` only, model-pinned to the ids we serve,
  `max_tokens` clamped, body-size capped, rate-limited — it can't be used as a general
  Claude API.
- **CORS** allows only `chrome-extension://` origins + the configured `ALLOWED_ORIGINS`
  (the landing). Never `*`.

## 🔑 Rotate these secrets NOW (they were exposed in chat/dev logs)
Regenerate each in its dashboard, update the env, restart/redeploy:

| Secret | Where | Update |
|---|---|---|
| Supabase **DB password** | Supabase → Settings → Database → Reset password | `server/.env` `DATABASE_URL` (re-encode special chars, e.g. `@`→`%40`) |
| Supabase **service_role key** | Supabase → Settings → API → Roll | `landing/.env.local` `SUPABASE_SERVICE_ROLE_KEY` |
| **Polar access token** | Polar → Settings → Developers | `server/.env` `POLAR_ACCESS_TOKEN` |
| **Polar webhook secret** | Polar → Webhooks → endpoint | `server/.env` `POLAR_WEBHOOK_SECRET` (must match the live endpoint) |
| **Anthropic API key** | console.anthropic.com | `server/.env` `ANTHROPIC_API_KEY` |
| **Deepgram API key** | console.deepgram.com | `server/.env` `DEEPGRAM_API_KEY` |
| **JWT_SECRET** | generate random 48+ bytes | `server/.env` `JWT_SECRET` (rotating invalidates live sessions — fine) |

`.env` / `.env.local` are gitignored; confirm they were never committed (`git log --all -- '**/.env'`).

## Production deployment checklist
- [ ] Apply `lockdown.sql` to the production Supabase project; verify
      `select relname, relrowsecurity from pg_class where relname in (...)` is all `true`.
- [ ] Set `ALLOWED_ORIGINS` on the billing server to the landing domain(s) only.
- [ ] All secrets in the host's secret manager (Railway/Render/Netlify env), never files.
- [ ] HTTPS everywhere; `POLAR_SUCCESS_URL` + webhook URL point to the deployed domains.
- [ ] Webhook secret matches the production endpoint; confirm a signed delivery returns 200.
- [ ] Rate limiting is in-memory (per-instance). If running >1 instance, move it to
      Upstash/Redis (`server/src/ratelimit.ts`, `landing/src/lib/ratelimit.ts`).

## Pre-launch backlog (known, deferred)
- **Deepgram scoped keys** — server mode currently hands clients the shared Deepgram key
  (a paying user could exfiltrate it for free Deepgram use). Switch to a Deepgram **admin**
  key that mints short-TTL scoped per-session keys before public launch (`server/src/deepgram.ts`).
- JWT `jti` + revocation table (invalidate a session immediately on cancel/abuse).
- Encrypt BYOK keys at rest in the extension (Web Crypto) for shared/enterprise machines.
- Structured audit logging for auth, checkout, and webhook events.
