# Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                           │
│                                                                 │
│   ┌──────────────────┐         ┌──────────────────────────┐    │
│   │   Google Meet    │         │  Side Panel (React)      │    │
│   │   (tab)          │         │  - File upload           │    │
│   │                  │         │  - Transcript display    │    │
│   │   audio ────────────┐      │  - Suggested questions   │    │
│   └──────────────────┘  │      │  - Evaluation badges     │    │
│                          │      └──────┬───────────────────┘    │
│   ┌──────────────────┐  │             │                        │
│   │ Background SW    │  │             │                        │
│   │ - tabCapture ◄───┘  │             │                        │
│   │ - WebSocket ────────┼─────────────┘                        │
│   └────────┬─────────┘  │                                      │
│            │            │                                      │
└────────────┼────────────┼──────────────────────────────────────┘
             │ WebSocket  │ (audio chunks + control messages)
             ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Fastify, localhost:3001)            │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │  WebSocket handler                                    │    │
│   │  - one connection = one interview session             │    │
│   │  - holds in-memory session state                      │    │
│   └────┬──────────────────────┬────────────────────┬──────┘    │
│        │                      │                    │           │
│        ▼                      ▼                    ▼           │
│   ┌─────────┐         ┌─────────────────┐    ┌──────────┐     │
│   │Deepgram │         │ Agent Layer     │    │ Report   │     │
│   │ WS      │         │ (Vercel AI SDK) │    │ generator│     │
│   │ client  │         │  - QGen         │    │          │     │
│   └────┬────┘         │  - AEval        │    └──────────┘     │
└────────┼──────────────┴──────┬──────────┴────────────────────┘
         │                     │
         ▼                     ▼
   ┌──────────┐         ┌────────────┐
   │ Deepgram │         │ Anthropic  │
   │ Nova-3   │         │ Claude     │
   │ (cloud)  │         │ Haiku 4.5  │
   └──────────┘         └────────────┘
```

## Components

### Chrome Extension

**Manifest:** MV3, side panel API, permissions: `tabCapture`, `activeTab`, `sidePanel`, `storage`, host permission `https://meet.google.com/*`.

**Background service worker** (`src/background/index.ts`)
- Activates side panel when user clicks extension icon
- Initiates `chrome.tabCapture.getMediaStreamId()` on user action
- Manages the WebSocket connection to backend
- Forwards audio chunks (binary frames) and control messages (JSON) over WS
- Forwards backend messages (transcript, agent outputs) to side panel via `chrome.runtime.sendMessage`

**Side panel** (`src/sidepanel/`)
- React 19 app, Tailwind 4 styling
- Zustand store for UI state (transcript, suggested questions, evaluations, session status)
- Components:
  - `SetupView` — file uploads, seniority/type selectors, Start button
  - `InterviewView` — split into TranscriptPanel and SuggestionsPanel
  - `TranscriptPanel` — scrolling list of turns, diarized
  - `SuggestionsPanel` — top: question suggestions (click to mark asked); below: per-answer evaluation cards
- File parsing happens in the side panel (not backend):
  - PDF via `pdfjs-dist`
  - DOCX via `mammoth`
  - Plain text accepted directly

**Content script** — minimal. Used only to inject a small indicator into the Meet tab confirming the extension is active. The side panel handles all real UI.

**Audio capture flow:**
1. User clicks "Start Interview" in side panel
2. Side panel sends `START_CAPTURE` message to background SW
3. Background SW calls `chrome.tabCapture.getMediaStreamId({ targetTabId })` to get a stream ID
4. Stream ID is passed to the side panel (offscreen document not needed for MV3 + side panel; capture runs in the side panel context)
5. `navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } })` returns a MediaStream
6. The MediaStream is fed into a `MediaRecorder` configured for `audio/webm; codecs=opus`, timeslice 250ms
7. Each `dataavailable` event yields a Blob, sent as a binary WS frame to the backend
8. **Important:** also pipe the stream back to the user's speakers — `chrome.tabCapture` mutes the tab by default, but you can route the stream through an `AudioContext` to keep audio audible to the interviewer

### Backend (Fastify)

**Entry:** `src/server.ts` — starts Fastify with `@fastify/websocket` plugin on port 3001.

**WebSocket handler:** `src/ws.ts`
- On connection: create a `Session` object in memory
- Receives messages of types defined in `shared/types.ts` (see Protocol below)
- Routes binary frames (audio) to the Deepgram client
- Routes JSON control messages (start, end, JD/resume metadata) to session state and agent layer

**Deepgram integration:** `src/deepgram.ts`
- Opens a Deepgram streaming WebSocket per session
- Config: `model=nova-3`, `language=en-US`, `smart_format=true`, `diarize=true`, `interim_results=true`, `endpointing=300`, `encoding=opus`
- Forwards audio frames from the extension WS directly to Deepgram WS
- On Deepgram message (final transcripts only), constructs a `TranscriptTurn` and routes to the agent layer
- Speaker mapping: Deepgram returns `speaker: 0 | 1`. Use a simple heuristic — the first speaker to talk after `Start Interview` is the Interviewer; the other is the Candidate. This is good enough for the prototype.

**Agent layer:** `src/agents/`
- Two agents (see `AGENTS.md` for full specs):
  - `questionGenerator.ts` — generates starting questions (on session start) and follow-up questions (after each candidate turn)
  - `answerEvaluator.ts` — evaluates each candidate turn for quality + evidence
- Both use Vercel AI SDK `streamObject` with Zod schemas
- Both run **in parallel** after each candidate turn — `Promise.all([qgen, aeval])`
- Outputs stream back to the extension over WS as partial JSON

**Report generator:** `src/report.ts`
- Triggered on `END_INTERVIEW` message
- Takes the full session state (transcript turns + evaluations + suggestions)
- Single Claude Sonnet 4 call (use Sonnet here, not Haiku, since this is a one-shot and quality matters more than latency)
- Returns markdown string, sent back to extension, which triggers a download

### Session state shape

In-memory only. One per active WS connection.

```typescript
// shared/types.ts
type Session = {
  id: string;                          // uuid
  startedAt: Date;
  jd: string;                          // parsed text
  resume: string;                      // parsed text
  seniority: 'junior' | 'mid' | 'senior';
  interviewType: 'screening' | 'deep_dive';
  transcript: TranscriptTurn[];
  suggestedQuestions: SuggestedQuestion[];
  evaluations: AnswerEvaluation[];
  askedQuestionIds: string[];
}

type TranscriptTurn = {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  startMs: number;
  endMs: number;
}

type SuggestedQuestion = {
  id: string;
  text: string;
  topic: string;
  rationale: string;
  generatedAt: number;                 // index into transcript at time of generation
  asked: boolean;
}

type AnswerEvaluation = {
  id: string;
  candidateTurnId: string;
  rating: 'weak' | 'adequate' | 'strong' | 'exceptional';
  evidence: string;                    // one-line quote or paraphrase
  topics: string[];
}
```

## WebSocket message protocol

All messages are JSON except audio chunks (binary).

### Extension → Backend

```typescript
type ClientMessage =
  | { type: 'START_INTERVIEW'; jd: string; resume: string; seniority: 'junior'|'mid'|'senior'; interviewType: 'screening'|'deep_dive' }
  | { type: 'MARK_QUESTION_ASKED'; questionId: string }
  | { type: 'END_INTERVIEW' }
  | { type: 'PING' }
```

Audio is sent as raw binary WS frames between `START_INTERVIEW` and `END_INTERVIEW`.

### Backend → Extension

```typescript
type ServerMessage =
  | { type: 'SESSION_STARTED'; sessionId: string }
  | { type: 'TRANSCRIPT_TURN'; turn: TranscriptTurn }
  | { type: 'QUESTIONS_GENERATED'; questions: SuggestedQuestion[]; replace: boolean }
  | { type: 'EVALUATION'; evaluation: AnswerEvaluation }
  | { type: 'REPORT_READY'; markdown: string }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' }
```

Notes:
- `QUESTIONS_GENERATED` with `replace: true` is sent once at session start; subsequent calls use `replace: false` to prepend new follow-ups
- Streaming partials from Vercel AI SDK `streamObject` should be sent as repeated `QUESTIONS_GENERATED` / `EVALUATION` messages with the same `id`; the extension overwrites by id

## Data flow per candidate turn

This is the hot path. It runs every time the candidate finishes speaking.

1. Audio chunks streaming from extension to backend (every 250ms)
2. Backend forwards to Deepgram WS
3. Deepgram sends interim transcripts (ignored for now) and a final transcript when it detects an endpoint
4. Backend builds a `TranscriptTurn`, adds to session, forwards to extension
5. **If speaker is Candidate**: backend fires off two agent calls in parallel:
   - `questionGenerator.followUp(session)` → streams new `SuggestedQuestion[]` (target 2–3)
   - `answerEvaluator.evaluate(session, turn)` → streams `AnswerEvaluation`
6. As Vercel AI SDK streams partial JSON objects, backend forwards each partial to the extension
7. Extension updates UI on each partial (Zustand store update → React re-render)

**Latency budget breakdown:**
- Deepgram endpoint detection: ~300ms after candidate stops speaking
- Network (Deepgram → backend → extension): ~50ms
- First token from Claude Haiku: ~400ms
- First useful partial JSON streamed: ~800ms after that
- **Total: ~1.5s** from candidate stops talking to first new content visible. Under budget.

## Key dependencies (with versions)

Pin these. Don't auto-update for the prototype.

### Extension
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "zustand": "^5.0.0",
  "pdfjs-dist": "^4.7.0",
  "mammoth": "^1.8.0",
  "tailwindcss": "^4.0.0",
  "vite": "^6.0.0",
  "@crxjs/vite-plugin": "^2.0.0-beta.27"
}
```

### Backend
```json
{
  "fastify": "^5.0.0",
  "@fastify/websocket": "^11.0.0",
  "@anthropic-ai/sdk": "^0.30.0",
  "@ai-sdk/anthropic": "^1.0.0",
  "ai": "^4.0.0",
  "@deepgram/sdk": "^3.9.0",
  "zod": "^3.23.0",
  "uuid": "^11.0.0"
}
```

### Shared
```json
{
  "typescript": "^5.7.0"
}
```

## Runtime / package management

- Node 22 LTS
- pnpm 9 (workspace mode — extension, backend, shared as separate packages)
- TypeScript with `"moduleResolution": "bundler"` in extension, `"node16"` in backend

## What we are NOT building (architecturally)

- No offscreen document (side panel is fine for audio capture in MV3)
- No service worker persistence (WS lives in side panel, not background — when side panel closes, session ends)
- No reconnection on backend restart (kill the side panel and start over)
- No CORS handling (extension → localhost WS doesn't need it)
- No rate limiting
- No request validation beyond Zod schemas on agent I/O

## Known risks / things to watch

1. **`chrome.tabCapture` mutes the tab.** You must route the captured stream through an `AudioContext.destination` to keep it audible to the interviewer. Test this early.
2. **Side panel closes if user navigates away from the Meet tab.** This is a Chrome limitation. Document it; don't try to work around it.
3. **Deepgram diarization can flip speakers** mid-call if voices are similar. Acceptable for the prototype. Don't engineer around it.
4. **Vercel AI SDK `streamObject` requires the LLM to return strict JSON.** Use Zod schemas with descriptive `.describe()` calls on every field; Claude follows them well but tighten if you see drift.
