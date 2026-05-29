# Interviewary — Prototype

Chrome extension that helps non-technical recruiters run technical interviews in Google Meet. Live transcription, AI-generated follow-up questions, per-answer evaluations, and an auto-generated hiring report at the end of the call.

This is a 2-week prototype built to validate with a single founder. Not a production product.

**Fully serverless / bring-your-own-key.** There is no backend to host. Everything
runs in the extension's side panel; the user supplies their own Deepgram + LLM keys
in a Settings screen.

## Quick start

```bash
# 1. Install dependencies (uses pnpm workspaces)
pnpm install

# 2. Build the extension in watch mode
pnpm --filter extension dev

# 3. Load extension into Chrome:
#    - chrome://extensions
#    - Enable Developer mode
#    - Load unpacked → select extension/dist

# 4. Open the side panel → Settings:
#    - Enter your Deepgram API key
#    - Pick an LLM provider (Anthropic / OpenAI / Google / xAI) + API key
#    - Pick a fast model (live agents) and a report model
#    - Click "Test keys", then "Save"
```

No `.env`, no server — keys are entered in the UI and stored in `chrome.storage.local`.

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

- Chrome MV3 extension (React 19 + Tailwind 4 + Vite) — no backend
- Deepgram Nova-3 for streaming transcription, called directly from the browser
- Multi-provider LLM (Anthropic / OpenAI / Google / xAI), bring-your-own-key, user picks a fast model + a report model
- Vercel AI SDK as the provider-agnostic streaming/structured-output layer
- TypeScript end-to-end via shared types

## Cost

The user pays for their own API usage. Deepgram's $200 free credit covers transcription; LLM spend is roughly a few cents per interview depending on the chosen models.

## What this is NOT

- A production product
- Multi-tenant or auth-gated
- Persisted (no database — sessions live in memory)
- Tested at scale
- Available on Zoom or Teams
- Open source (yet)

See `CLAUDE.md` → "Things to NEVER do in this prototype" for the full list of cut features.
