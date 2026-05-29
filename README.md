# Interview Copilot — Prototype

Chrome extension that helps non-technical recruiters run technical interviews in Google Meet. Live transcription, AI-generated follow-up questions, per-answer evaluations, and an auto-generated hiring report at the end of the call.

This is a 2-week prototype built to validate with a single founder. Not a production product.

## Quick start

```bash
# 1. Install dependencies (uses pnpm workspaces)
pnpm install

# 2. Copy env file and add your API keys
cp .env.example .env
# Edit .env with your Anthropic + Deepgram keys

# 3. Run the backend
pnpm --filter backend dev

# 4. In another terminal, build the extension in watch mode
pnpm --filter extension dev

# 5. Load extension into Chrome:
#    - chrome://extensions
#    - Enable Developer mode
#    - Load unpacked → select extension/dist
```

## Working with Claude Code on this project

This repo is structured for Claude Code:

- `CLAUDE.md` — entry point, auto-loaded. Read first.
- `docs/PRD.md` — what we're building (and explicitly not building)
- `docs/ARCHITECTURE.md` — system design, data flow, message protocol
- `docs/AGENTS.md` — LLM agent specs, prompts, schemas
- `docs/BUILD_PLAN.md` — phased build plan with success criteria
- `docs/DEMO.md` — founder demo script

When asking Claude Code to work on a task, point it at the relevant doc(s). The build plan is the source of truth for sequencing.

## Tech stack

- Chrome MV3 extension (React 19 + Tailwind 4 + Vite)
- Node 22 + Fastify backend with WebSockets
- Deepgram Nova-3 for streaming transcription
- Anthropic Claude Haiku 4.5 for agents (Sonnet 4 for the end-of-call report)
- Vercel AI SDK as the streaming/structured-output layer
- TypeScript end-to-end via shared types

## Cost

Under $5 in API costs for the full prototype build + 30 test interviews. Deepgram's $200 free credit covers transcription. Anthropic spend is ~$0.10 per interview.

## What this is NOT

- A production product
- Multi-tenant or auth-gated
- Persisted (no database — sessions live in memory)
- Tested at scale
- Available on Zoom or Teams
- Open source (yet)

See `CLAUDE.md` → "Things to NEVER do in this prototype" for the full list of cut features.
