# Build Plan

Two weeks. Seven phases. Each phase has a clear success criterion — if the success criterion isn't met, don't move to the next phase.

Total estimated effort: 60–80 hours of focused work.

---

## Phase 0 — Project scaffolding (½ day)

**Goal:** A workspace that builds and runs end-to-end with no real functionality.

### Tasks
1. Create monorepo with pnpm workspaces: `extension/`, `backend/`, `shared/`
2. Initialize TypeScript configs in all three packages
3. Set up `shared/types.ts` with the protocol types from `ARCHITECTURE.md`
4. Set up backend Fastify server on port 3001 with a single `/health` endpoint
5. Set up extension scaffold with `@crxjs/vite-plugin`, MV3 manifest, an empty React side panel that says "Hello"
6. Load the extension in Chrome (developer mode) and confirm side panel opens
7. Set up Tailwind 4 in the extension
8. Add `.env.example` with `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `PORT`
9. Add scripts to root `package.json` for `dev`, `build`

### Success criterion
- `pnpm dev` starts the backend
- `pnpm --filter extension dev` builds the extension
- Loading the unpacked extension in Chrome shows the side panel
- `curl localhost:3001/health` returns 200

---

## Phase 1 — Extension UI shell (1 day)

**Goal:** The side panel renders the setup view and the (empty) interview view, with state managed by Zustand. No backend connection yet.

### Tasks
1. Set up Zustand store with `Session` shape from `shared/types.ts`
2. Build `SetupView`:
   - Two file upload widgets (JD, Resume) — drag and drop with file input fallback
   - File parsing in-browser:
     - PDF via `pdfjs-dist`
     - DOCX via `mammoth`
     - `.txt` via FileReader
   - Show parsed text preview (collapsible) so user can verify upload worked
   - Dropdowns for seniority and interview type
   - Big "Start Interview" button (disabled until JD + resume present)
3. Build `InterviewView` skeleton:
   - Header with elapsed time + "End Interview" button
   - Two-column layout: SuggestionsPanel (top half) + TranscriptPanel (bottom half)
   - Empty states for both
4. Wire SetupView → InterviewView transition via Zustand state

### Success criterion
- Upload a PDF JD and DOCX resume → preview text appears
- Click Start Interview → view switches to empty interview view
- Click End Interview → returns to setup view

---

## Phase 2 — Backend WebSocket + session state (½ day)

**Goal:** Backend accepts WebSocket connections, manages a per-session state, and round-trips JSON control messages.

### Tasks
1. Add `@fastify/websocket` to backend, mount on `/ws`
2. On connection: create a `Session` object (in-memory `Map<string, Session>` keyed by session id)
3. Implement message routing per `ARCHITECTURE.md` protocol:
   - `START_INTERVIEW` → store JD/resume/seniority/interviewType in session, respond `SESSION_STARTED`
   - `END_INTERVIEW` → trigger report generation (stub for now: return `REPORT_READY` with `# Test Report\n` as content)
   - `PING` → respond `PONG`
4. Extension: implement WS client in `src/lib/ws.ts` with auto-connect on side panel mount, send `START_INTERVIEW` on Start, send `END_INTERVIEW` on End
5. Extension: on `REPORT_READY`, trigger a download of the markdown as `interview-{date}.md`

### Success criterion
- Open side panel → WS connects to backend (visible in network tab)
- Upload files + Start → backend logs the JD/resume content
- Click End → markdown file downloads with stub content

---

## Phase 3 — Audio capture + Deepgram streaming (2 days)

**This is the riskiest phase. Allocate full time.**

**Goal:** Live transcripts appear in the side panel as someone speaks in the Meet tab.

### Tasks
1. Extension audio capture:
   - On Start Interview, get the active tab id (must be the Meet tab — check URL pattern, show error otherwise)
   - Background SW: `chrome.tabCapture.getMediaStreamId({ targetTabId })`
   - Pass streamId to side panel via `chrome.runtime.sendMessage`
   - Side panel: `navigator.mediaDevices.getUserMedia` with the streamId
   - **CRITICAL:** Route the stream through `AudioContext.destination` to keep the tab audible (without this, `tabCapture` mutes the tab and the interviewer can't hear the candidate)
   - Set up `MediaRecorder` with `audio/webm;codecs=opus`, timeslice 250
   - On `dataavailable`, send Blob as binary WS frame
2. Backend Deepgram integration:
   - On `START_INTERVIEW`, open a Deepgram streaming WS via `@deepgram/sdk`
   - Config: `nova-3`, `en-US`, `smart_format=true`, `diarize=true`, `interim_results=false`, `endpointing=300`, `encoding=opus`
   - Forward incoming binary frames from extension WS directly to Deepgram WS
   - On Deepgram message with `is_final=true`: build a `TranscriptTurn` with speaker mapping (speaker 0 = interviewer if it's the first speaker, else candidate; persist mapping in session)
   - Send `TRANSCRIPT_TURN` to extension
3. Extension: render incoming `TRANSCRIPT_TURN` messages in the TranscriptPanel, color-coded by speaker, auto-scroll to bottom

### Success criterion
- Open Meet, start an interview, speak into the call
- Your speech appears in the side panel transcript within 1 second of finishing each sentence
- The Meet tab audio is still audible during capture
- A second voice (use a colleague or a YouTube video in another tab speaking) gets labeled as a different speaker

### Common pitfalls
- `tabCapture` permission requires user gesture — call from the Start button click, not on page load
- If audio is muted, you forgot the `AudioContext` re-routing
- If Deepgram sends `is_final=false` only, your `endpointing` is misconfigured
- Make sure backend forwards opus directly — do not decode/re-encode

---

## Phase 4 — Question Generator (start mode) (½ day)

**Goal:** When the interviewer clicks Start, 5–7 suggested starting questions appear in the side panel within 3 seconds.

### Tasks
1. Set up Vercel AI SDK on backend with `@ai-sdk/anthropic`
2. Implement `generateQuestions` per `AGENTS.md` with mode `'start'`
3. On `START_INTERVIEW` after session setup, call `generateQuestions` and stream `QUESTIONS_GENERATED` messages back (with `replace: true`)
4. Extension: render suggested questions in SuggestionsPanel with text, topic tag, and rationale (collapsible)
5. Each question has a "Mark as asked" button that sends `MARK_QUESTION_ASKED` (greys it out)

### Success criterion
- Start an interview with a real JD and resume → starting questions stream in within 3 seconds
- Questions are obviously tailored to the JD/resume (not generic)
- Mark a question as asked → it greys out and is excluded from future follow-ups

---

## Phase 5 — Answer Evaluator + follow-up Question Generator (1.5 days)

**Goal:** After each candidate turn, an evaluation badge appears under the relevant transcript turn, AND 2–3 new follow-up questions appear at the top of the suggestions panel. Both within 2 seconds of the candidate finishing.

### Tasks
1. Implement `evaluateAnswer` per `AGENTS.md`
2. Implement `generateQuestions` mode `'followup'`
3. Backend: when a `TranscriptTurn` is added with `speaker: 'candidate'`:
   - Build inputs for both agents
   - Fire both calls in parallel with `Promise.all`
   - Stream partials of each back to extension as `EVALUATION` / `QUESTIONS_GENERATED`
4. Extension: render `EVALUATION` as a badge attached to the relevant candidate turn in the transcript (rating + evidence)
5. Extension: prepend new follow-up questions to the suggestions panel, with a visual "new" indicator that fades after a few seconds

### Success criterion
- In a mock interview, every candidate answer gets a rating + evidence within ~2 seconds
- Follow-up questions are clearly responsive to what the candidate just said (test: ask about React, candidate mentions hooks → next questions probe hooks)
- Both update streams visibly tokens-arriving, not pop-in-all-at-once

---

## Phase 6 — Report generation (½ day)

**Goal:** On End Interview, a real markdown report is generated and downloaded.

### Tasks
1. Implement `generateReport` per `AGENTS.md` with Claude Sonnet 4
2. On `END_INTERVIEW`, gather full session state, call `generateReport`, send `REPORT_READY` with the markdown
3. Extension: on `REPORT_READY`, trigger download with filename `interview-{candidate-name-or-date}.md`
4. Test with a recorded 10-minute mock interview

### Success criterion
- Report is 1–2 pages of markdown
- Every Q&A pair from the live interview appears
- Strengths and concerns sections are evidence-backed (not generic)
- Hiring manager could read it and form a real opinion

---

## Phase 7 — Polish + dry runs (2 days)

**Goal:** The demo doesn't embarrass you.

### Tasks
1. Visual polish on the side panel:
   - Tailwind tweaks: spacing, typography, color tokens
   - Rating badges with clear color coding (red/yellow/green/blue)
   - Loading states everywhere agent calls are pending
   - Smooth animations for new questions appearing
2. Error handling:
   - WS disconnect → show banner, attempt reconnect
   - Deepgram error → show banner, allow restart without losing JD/resume
   - LLM error → show banner, log, allow retry
3. Run THREE full mock interviews end-to-end with a friend playing candidate:
   - One frontend candidate
   - One backend candidate
   - One full-stack senior candidate
4. After each: read the generated report, note where the AI got things wrong, tighten the prompts
5. Time the latency from candidate-stop-talking to questions-appearing on every turn; if any exceed 3s, debug
6. Practice the demo flow (see `docs/DEMO.md`) at least twice

### Success criterion
- Three mock interviews completed without crashes
- All evaluations and follow-ups land within 3 seconds (target 2)
- Reports are demo-quality for all three
- You can complete the demo script from `docs/DEMO.md` in under 10 minutes

---

## What "done" means

The prototype is done when:
1. All 7 phases pass their success criteria
2. The demo script in `docs/DEMO.md` runs cleanly twice in a row
3. Total Anthropic + Deepgram spend is under $10
4. You can articulate, in one sentence, why this is better than "Otter + ChatGPT"

## Scope drift watch

If during the build you find yourself wanting to add:
- A second LLM agent beyond the two specified
- Persistence of any kind
- Account creation
- "Just a quick settings page"
- Multi-language support
- Mobile support
- Better-than-mock styling system / design system

→ STOP. Re-read `CLAUDE.md` → "Things to NEVER do." If it's on the list, don't build it. If it's not on the list but feels like creep, ask before building.

The goal is a founder demo, not a launchable product. Polish where the founder will look. Skip everywhere else.
