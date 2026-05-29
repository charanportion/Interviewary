# Interview Copilot — Prototype

> This file is the entry point for Claude Code. Read it first on every session.
> Then read `docs/` files as needed for the task at hand.

## What we're building

A Chrome extension that runs in the side panel during a Google Meet interview. It transcribes the candidate's answers in real time and helps a **non-technical recruiter** conduct **technical interviews** by suggesting questions and evaluating answer quality. At the end of the interview, it generates a downloadable markdown report.

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
- **Backend:** Node 22 + Fastify + `@fastify/websocket`, TypeScript
- **Transcription:** Deepgram Nova-3 streaming over WebSocket
- **LLM:** Anthropic Claude Haiku 4.5 (both agents during prototyping)
- **Agent layer:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — used as a streaming wrapper, not an agent framework
- **Storage:** None. In-memory only. Reports downloaded as `.md` files.
- **Auth:** None.
- **Deploy:** Local only. `ngrok` for the founder demo if remote needed.

## Critical conventions

1. **Latency budget: 2 seconds.** From "candidate stops talking" to "new content visible in side panel." Every architectural decision is subject to this constraint. If a feature would break this budget, defer it.
2. **No database.** State lives in memory on the backend, scoped to a single interview session. When the WebSocket closes, the session is gone (except the downloaded report).
3. **No auth.** Single-user prototype. Do not add auth scaffolding "for later."
4. **No persistence between sessions.** Resume + JD are uploaded fresh each interview.
5. **TypeScript end-to-end.** Extension and backend share types via a `shared/` directory.
6. **Streaming everywhere.** Deepgram → backend → extension side panel must stream. Agent outputs must stream. Do not buffer-then-send.
7. **Two agents only.** Question Generator and Answer Evaluator. Do not add a third agent (Coverage Tracker, Red Flag Watcher, etc.) for the prototype.

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
- Web dashboard / settings page
- Chrome Web Store publishing
- Observability tooling (Langfuse, Sentry, PostHog)
- Tests beyond a smoke test for the agent calls

If a feature isn't in `docs/PRD.md` under "In scope," it is out of scope. Ask before adding it.

## Repo layout (expected)

```
interview-copilot/
├── CLAUDE.md                 ← this file
├── README.md                 ← human-readable overview
├── .env.example
├── package.json              ← workspace root
├── pnpm-workspace.yaml
├── extension/                ← Chrome MV3 extension (React side panel)
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── sidepanel/        ← React UI for the side panel
│   │   ├── background/       ← service worker
│   │   ├── content/          ← content script (Meet tab)
│   │   └── lib/              ← audio capture, WebSocket client
│   └── package.json
├── backend/                  ← Fastify server
│   ├── src/
│   │   ├── server.ts         ← entry point
│   │   ├── ws.ts             ← WebSocket handler
│   │   ├── deepgram.ts       ← STT integration
│   │   ├── agents/
│   │   │   ├── questionGenerator.ts
│   │   │   └── answerEvaluator.ts
│   │   └── report.ts         ← end-of-call markdown generation
│   └── package.json
├── shared/                   ← shared TS types between extension and backend
│   └── types.ts
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── AGENTS.md
    ├── BUILD_PLAN.md
    └── DEMO.md
```

## Commands

These commands should work after Phase 0 setup. If they don't, fix the setup before building features.

```bash
# Install everything
pnpm install

# Run backend (port 3001)
pnpm --filter backend dev

# Run extension build in watch mode
pnpm --filter extension dev

# Load extension into Chrome:
# 1. chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select extension/dist
```

## Environment variables

See `.env.example` for the full list. Required for the backend to function:

- `ANTHROPIC_API_KEY` — Anthropic API key
- `DEEPGRAM_API_KEY` — Deepgram API key (sign up for free $200 credit)
- `PORT` — backend port (default 3001)

The extension does not need its own env vars; it talks to `ws://localhost:3001`.

## How to ask for help

If a requirement is ambiguous, STOP and ask before writing code. The cost of asking is one message; the cost of building the wrong thing is a wasted day.

Common ambiguities to watch for:
- "Should this be in the extension or the backend?" — default to backend unless it's pure UI
- "Should this persist?" — no, never, see conventions
- "Should I add error handling for X?" — only if X has happened in testing; do not preemptively handle every error
- "Should I support Zoom / Teams?" — no, Google Meet only
