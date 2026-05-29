# Interviewary — Prototype

> This file is the entry point for Claude Code. Read it first on every session.
> Then read `docs/` files as needed for the task at hand.

## What we're building

A Chrome extension that runs in the side panel during a Google Meet interview. It transcribes the candidate's answers in real time and helps a **non-technical recruiter** conduct **technical interviews** by suggesting questions and evaluating answer quality. At the end of the interview, it generates a downloadable markdown report.

**Fully serverless / BYO-key.** There is no backend we host. The user installs the unpacked extension, enters their own Deepgram key and an LLM provider + API key + models in a Settings screen, and everything runs client-side in the side panel. Deepgram and the LLM provider are called directly from the browser (CORS is bypassed via manifest `host_permissions`).

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
- **Backend:** None. All logic runs in the side panel (see `extension/src/lib/engine.ts`).
- **Transcription:** Deepgram Nova-3 streaming over a native browser WebSocket (`wss://api.deepgram.com/v1/listen`, `['token', key]` subprotocol auth)
- **LLM:** BYO-key, multi-provider — Anthropic, OpenAI, Google (Gemini), xAI (Grok). User picks a fast model (live agents) and a report model.
- **Agent layer:** Vercel AI SDK (`ai` + `@ai-sdk/{anthropic,openai,google,xai}`) — used as a provider-agnostic streaming wrapper, not an agent framework. `extension/src/lib/llm.ts` builds the model from settings.
- **Storage:** No DB. Session state in memory in the side panel. Settings (keys/models) in `chrome.storage.local`. Reports downloaded as `.md` files.
- **Auth:** None.
- **Deploy:** None. Users load the unpacked extension and configure their own keys.

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

- Database / persistence (Postgres, SQLite, anything)
- User auth / accounts / Clerk
- Billing / pricing / Stripe
- ATS integrations (Greenhouse, Lever, etc.)
- Multi-tenancy or organizations
- Skill coverage tracker (UI or backend)
- Red flag detector agent
- Custom rubrics / skill libraries
- Recall.ai or any meeting bot infrastructure
- Web dashboard (the in-panel Settings screen for BYO keys/models is in scope; a separate web/settings dashboard is not)
- A hosted backend / proxy server (the whole point is serverless, BYO-key)
- Chrome Web Store publishing
- Observability tooling (Langfuse, Sentry, PostHog)
- Tests beyond a smoke test for the agent calls

If a feature isn't in `docs/PRD.md` under "In scope," it is out of scope. Ask before adding it.

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
│   │       ├── llm.ts        ← provider-agnostic model factory
│   │       ├── providers.ts  ← provider/model catalog
│   │       ├── settings.ts   ← chrome.storage.local persistence
│   │       ├── validateKeys.ts ← "Test keys" checks
│   │       └── agents/       ← questionGenerator, answerEvaluator, report, schemas
│   └── package.json
├── shared/                   ← shared TS types (consumed by the extension)
│   └── src/types.ts
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

# Load extension into Chrome:
# 1. chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select extension/dist
# 5. Open the side panel → Settings → enter Deepgram + LLM keys → Test keys → Save
```

## Environment variables / keys

There are **no build-time or server env vars**. All credentials are entered by the
user at runtime in the in-panel Settings screen and stored in `chrome.storage.local`:

- Deepgram API key (free $200 credit on signup)
- An LLM provider (Anthropic / OpenAI / Google / xAI) + that provider's API key
- A fast model (live agents) and a report model

Keys never leave the user's machine and are not synced.

## How to ask for help

If a requirement is ambiguous, STOP and ask before writing code. The cost of asking is one message; the cost of building the wrong thing is a wasted day.

Common ambiguities to watch for:
- "Should this be in the extension or a backend?" — there is no backend; it all runs in the side panel
- "Should this persist?" — no, never, except BYO-key settings (see conventions)
- "Should I add error handling for X?" — only if X has happened in testing; do not preemptively handle every error
- "Should I support Zoom / Teams?" — no, Google Meet only
