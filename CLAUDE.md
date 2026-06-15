# Interviewary — Prototype

> This file is the entry point for Claude Code. Read it first on every session.
> Then read `docs/` files as needed for the task at hand.

## What we're building

A Chrome extension that runs in the side panel during a Google Meet interview. It transcribes the candidate's answers in real time and helps a **non-technical recruiter** conduct **technical interviews** by suggesting questions and evaluating answer quality. At the end of the interview, it generates a downloadable markdown report.

**Two runtimes (BYOK + paid credits).** As of the payments work, the extension supports:

- **BYOK (lifetime):** the user enters their own Deepgram key + LLM provider/key/models in
  Settings; everything runs client-side in the side panel (the original serverless design).
  Deepgram and the LLM provider are called directly from the browser (CORS bypassed via
  `host_permissions`).
- **Server mode (credits):** the extension calls our **billing server** (`server/`), which
  proxies the LLM with our keys and hands the extension our Deepgram key so it
  still connects to Deepgram **directly** (the 2s latency budget is preserved — audio is never
  tunneled through us). Usage is metered where **1 credit = 1 interview minute**.

**Payments via Polar (Merchant of Record).** Access is hard-paywalled: a user buys **Lifetime**
(one-time, BYOK + N free credits) or a **Subscription** (recurring, credit allotment) before
running interviews; top-ups add credits. Identity is a Polar **license key** pasted in Settings.
Polar is the source of truth for entitlements/grants; the server caches them in Supabase Postgres and
**enforces** the credit balance (Polar ingests usage but never blocks on balance). See
`server/README.md`. Payments are **off** when `VITE_BILLING_SERVER_URL` is unset — that build is
pure-BYOK with no paywall, exactly as before.

This is a **2-week prototype** to demo to a founder. It is not a production product. Optimize for:
- Time-to-demo over engineering polish
- The core loop working end-to-end over edge cases
- Cost staying under $5 total for the prototype

## Document map

Read these in order when starting fresh on a task:

| Document | When to read it |
|---|---|
| `docs/PRD.md` | Always — defines what's in/out of scope |
| `docs/ARCHITECTURE.md` | When working on system-level code, data flow, or message protocol |
| `docs/AGENTS.md` | When working on LLM agent code, prompts, or schemas |
| `docs/BUILD_PLAN.md` | When deciding what to build next |
| `docs/DEMO.md` | When preparing the founder demo |

## Tech stack at a glance

- **Extension:** Chrome MV3, React 19, Tailwind 4, TypeScript, Vite + `@crxjs/vite-plugin`
- **Backend:** None for BYOK (all logic runs in the side panel — see `extension/src/lib/engine.ts`). A small **billing server** (`server/`: Hono on Node + Supabase Postgres + Polar SDK) powers paid server mode + entitlements only.
- **Transcription:** Deepgram Nova-3 streaming over a native browser WebSocket (`wss://api.deepgram.com/v1/listen`, `['token', key]` subprotocol auth)
- **LLM:** BYO-key, multi-provider — Anthropic, OpenAI, Google (Gemini), xAI (Grok). User picks a fast model (live agents) and a report model.
- **Agent layer:** Vercel AI SDK (`ai` + `@ai-sdk/{anthropic,openai,google,xai}`) — used as a provider-agnostic streaming wrapper, not an agent framework. `extension/src/lib/llm.ts` builds the model from settings.
- **Storage:** No DB in the extension. Session state in memory in the side panel. Settings (keys/models/license key/mode) in `chrome.storage.local`. Reports downloaded as `.md` files. The billing server uses **Supabase Postgres** to cache entitlements + a usage ledger.
- **Auth:** None in the extension UI. The billing server identifies users by a Polar **license key** → short-lived session token (`jose` JWT).
- **Payments:** **Polar** (Merchant of Record): one-time (lifetime), subscription, top-ups; usage meter for credits; license-key benefit; webhooks.
- **Deploy:** Extension is loaded unpacked. The billing server deploys to Railway/Render (see `server/README.md`).

## Critical conventions

1. **Latency budget: 2 seconds.** From "candidate stops talking" to "new content visible in side panel." Every architectural decision is subject to this constraint. If a feature would break this budget, defer it.
2. **No database.** Session state lives in memory in the side panel (`engine.ts`), scoped to a single interview. When the panel closes, the session is gone (except the downloaded report). Only BYO-key settings persist, in `chrome.storage.local`.
3. **No auth.** Single-user prototype. Do not add auth scaffolding "for later."
4. **No persistence between sessions.** Resume + JD are uploaded fresh each interview. (Settings are the one exception — keys/models are remembered.)
5. **TypeScript end-to-end.** Shared types live in `shared/` (consumed by the extension).
6. **Streaming everywhere.** Deepgram → side panel must stream. Agent outputs must stream. Do not buffer-then-send.
7. **Two agents only.** Question Generator and Answer Evaluator. Do not add a third agent (Coverage Tracker, Red Flag Watcher, etc.) for the prototype.
8. **Provider-agnostic LLM calls.** Agents take a Vercel AI SDK `LanguageModel`; only `llm.ts` knows about specific providers. Don't hardcode a provider in agent code.

## Things to NEVER do in this prototype

These have been explicitly cut for scope. Do not add them, even partially, even "just the scaffolding":

- ATS integrations (Greenhouse, Lever, etc.)
- Multi-tenancy or organizations
- Skill coverage tracker (UI or backend)
- Red flag detector agent
- Custom rubrics / skill libraries
- Recall.ai or any meeting bot infrastructure
- Web dashboard (the in-panel Settings screen is in scope; a separate web/settings dashboard is not)
- Chrome Web Store publishing
- Observability tooling (Langfuse, Sentry, PostHog)
- Tests beyond a smoke test for the agent calls

**Scoped carve-out (approved, payments work):** database, auth, billing, and a hosted
backend were originally on this list. They are now **allowed but ONLY inside `server/`** and
ONLY in service of Polar payments + credit-metered server mode. Do **not** spread them into the
extension (the side panel stays DB-less and auth-UI-less), do **not** add a payment provider
other than Polar, and do **not** build a credit/entitlement feature the server doesn't already
support without asking. The BYOK side-panel path must keep working with `VITE_BILLING_SERVER_URL`
unset.

If a feature isn't in `docs/PRD.md` under "In scope" (or the payments scope above), it is out of scope. Ask before adding it.

## Repo layout (expected)

```
interview-copilot/
├── CLAUDE.md                 ← this file
├── README.md                 ← human-readable overview
├── package.json              ← workspace root
├── pnpm-workspace.yaml
├── extension/                ← Chrome MV3 extension (everything runs here)
│   ├── manifest.config.ts    ← MV3 manifest (host_permissions for Deepgram + LLM providers)
│   ├── src/
│   │   ├── sidepanel/        ← React UI
│   │   │   ├── store.ts      ← Zustand store (+ settings, phases)
│   │   │   └── views/        ← SetupView, InterviewView, SettingsView, panels
│   │   ├── background/       ← service worker (side panel open/tab tracking)
│   │   └── lib/
│   │       ├── audio.ts      ← chrome.tabCapture → MediaRecorder chunks
│   │       ├── deepgramLive.ts ← browser WebSocket to Deepgram
│   │       ├── engine.ts     ← interview orchestration (was the backend)
│   │       ├── llm.ts        ← provider-agnostic model factory (+ server-mode proxy branch)
│   │       ├── billing.ts    ← client for the billing server (resolve/me/session/checkout)
│   │       ├── providers.ts  ← provider/model catalog
│   │       ├── settings.ts   ← chrome.storage.local persistence
│   │       ├── validateKeys.ts ← "Test keys" checks
│   │       └── agents/       ← questionGenerator, answerEvaluator, report, schemas
│   └── package.json
├── shared/                   ← shared TS types (consumed by extension + server)
│   └── src/
│       ├── types.ts          ← session/agent/protocol types
│       └── billing.ts        ← payments & credits protocol (entitlement, DTOs)
├── server/                   ← billing server (Hono + Supabase + Polar) — paid mode only
│   ├── README.md             ← Polar/Supabase/Deepgram setup steps
│   ├── schema.sql            ← Supabase Postgres schema
│   └── src/
│       ├── index.ts          ← Hono app: auth/resolve, me, session/*, llm proxy, checkout, webhooks
│       ├── polar.ts          ← Polar SDK: validate license, customer state, ingest usage, checkout
│       ├── deepgram.ts       ← server-mode Deepgram key (handed to the extension)
│       ├── auth.ts           ← session-token (jose JWT) issue/verify
│       ├── db.ts             ← Supabase data-access layer
│       └── env.ts            ← typed env config
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── AGENTS.md
    ├── BUILD_PLAN.md
    └── DEMO.md
```

> Note: the `docs/` files predate the serverless/BYO-key migration and still
> describe the old Fastify backend + WebSocket protocol. Treat this CLAUDE.md as
> the source of truth for architecture; the docs are background on the agents,
> prompts, and product scope.

## Commands

These commands should work after Phase 0 setup. If they don't, fix the setup before building features.

```bash
# Install everything
pnpm install

# Run extension build in watch mode
pnpm --filter extension dev

# Run the billing server (paid mode) — copy server/.env.example → server/.env first
pnpm --filter @interview-copilot/server dev
pnpm --filter @interview-copilot/server db:init   # apply Supabase schema once

# Load extension into Chrome:
# 1. chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select extension/dist
# 5. Open the side panel → Settings → enter Deepgram + LLM keys → Test keys → Save
#    (or, in a payments build, Activate a Polar license key and pick a mode)
```

## Environment variables / keys

**Extension (BYOK):** credentials are entered at runtime in Settings and stored in
`chrome.storage.local` — never synced:
- Deepgram API key (free $200 credit on signup)
- An LLM provider (Anthropic / OpenAI / Google / xAI) + that provider's API key
- A fast model (live agents) and a report model

**Extension build-time (Vite):** one optional var, `VITE_BILLING_SERVER_URL` (see
`extension/.env.example`). Unset ⇒ pure-BYOK build, no paywall. Set ⇒ enables payments + server mode.

**Billing server:** secrets live in `server/.env` (never in the extension) — Supabase `DATABASE_URL`,
Polar access token / org id / webhook secret / product ids / meter id, a `JWT_SECRET`, the
Deepgram admin key + project id, and the server-mode LLM key. See `server/.env.example` and
`server/README.md`.

## How to ask for help

If a requirement is ambiguous, STOP and ask before writing code. The cost of asking is one message; the cost of building the wrong thing is a wasted day.

Common ambiguities to watch for:
- "Should this be in the extension or a backend?" — interview logic runs in the side panel. Only Polar payments + credit-metered server mode live in `server/`. Don't move interview logic server-side.
- "Should this persist?" — extension: no, except settings. Server: only entitlement cache + usage ledger in Supabase (see `server/`).
- "Should I add error handling for X?" — only if X has happened in testing; do not preemptively handle every error
- "Should I support Zoom / Teams?" — no, Google Meet only
