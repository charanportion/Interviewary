# PRD — Interviewary Prototype

## Problem

Startups conduct technical screening interviews using non-technical staff (recruiters, founders, ops). The interviewer can:
- Read questions from a list
- Hear the candidate's answer

The interviewer cannot:
- Evaluate whether the answer is technically correct
- Tell whether the answer demonstrates senior-tier vs. junior-tier understanding
- Decide what to ask next based on what was just said
- Distinguish memorized answers from real understanding

Result: high false-positive rate (candidates pass the screen and get rejected by an engineer in round two), wasted engineering time, slower hiring.

## Target user (prototype)

A single founder we have access to, who runs technical screens with a non-technical interviewer and has expressed pain about it. We are building this prototype to show **them specifically**. Their feedback determines whether we build the full product.

## What the prototype proves

If we can show, in a live demo, that:
1. The interviewer can open the extension, upload a JD + resume, and get useful starting questions
2. As the candidate answers, the side panel shows whether the answer was strong or weak (with one-line evidence)
3. New follow-up questions appear based on what the candidate just said, within ~2 seconds
4. At the end of the call, a clean markdown report is downloadable

...then we have validated the core loop. Everything else (auth, billing, integrations, multi-agent depth, polish) is downstream of that validation.

## Core user journey (end-to-end)

1. Interviewer joins a Google Meet call
2. Opens the Chrome extension side panel
3. Uploads the Job Description (PDF, DOCX, or pasted text)
4. Uploads the candidate's resume (PDF or DOCX)
5. Optionally selects: seniority target (Junior / Mid / Senior) and interview type (Screening / Deep-dive)
6. Clicks **Start Interview**
7. Side panel shows:
   - Top: 5–7 suggested starting questions
   - Below: a live transcript of the call (interviewer + candidate, diarized)
   - When an answer completes: an inline evaluation badge (Weak / Adequate / Strong / Exceptional) with one-line evidence
   - When a new candidate utterance completes: 2–3 follow-up questions appear at the top
8. Interviewer asks questions (their choice — clicking a suggested question is optional but marks it as "asked")
9. When the interview ends, interviewer clicks **End Interview**
10. A markdown report is downloaded with: candidate summary, Q&A pairs with evaluations, overall hire/no-hire signal, areas to probe in round two

## In scope (build these)

### Extension (side panel)
- File upload widget (JD + resume) with PDF and DOCX parsing in-browser
- Seniority + interview-type dropdowns
- Start / End interview controls
- Live transcript display, diarized (Interviewer / Candidate), scrolling
- Suggested questions list (click-to-mark-asked)
- Per-answer evaluation badges with one-line evidence
- Audio capture via `chrome.tabCapture` on the Meet tab
- WebSocket connection to backend with reconnect-on-drop

### Backend
- WebSocket endpoint that:
  - Receives audio chunks from the extension
  - Forwards them to Deepgram's streaming WebSocket
  - Receives transcripts back from Deepgram
  - Routes transcript turns to the agent layer
  - Streams agent outputs back to the extension
- Two agents:
  - **Question Generator** — runs on initial JD+resume upload (starting questions) and after each candidate turn (follow-ups)
  - **Answer Evaluator** — runs after each candidate turn (quality rating + evidence)
- In-memory session state (one session per WebSocket connection)
- End-of-call report generation as markdown

### File parsing
- PDF parsing via `pdfjs-dist` (in-extension)
- DOCX parsing via `mammoth` (in-extension)
- Plain text paste as fallback

## Out of scope (do not build)

See `CLAUDE.md` → "Things to NEVER do in this prototype" for the full list. Highlights:
- Database, auth, billing, ATS integrations
- Coverage tracker, red flag detector
- Recall.ai bot path (extension only)
- Tests beyond a smoke test
- Production deployment

## Success criteria for the founder demo

A successful demo means:
- Setup takes <2 minutes (upload JD + resume + start)
- Latency from candidate finishing speaking to follow-up questions appearing is <3 seconds (target 2)
- At least one suggested question is one the founder calls "actually good"
- The report is good enough that the founder asks "can I take this to my hiring manager?"
- Nothing crashes during a 15-minute mock interview

We are not aiming for perfect. We are aiming for "this is clearly worth building further."

## Open questions to resolve before / during the demo

These should be asked of the founder after the demo, not engineered around:
1. How many technical interviews per week does their team run?
2. What is their current false-positive rate (screened → rejected by engineer in next round)?
3. Are they screening for breadth (full-stack generalist) or depth (specific stack)?
4. Would they pilot this on a real interview within 2 weeks?
5. Who else on their team would use this? (Determines seat-vs-usage pricing.)

## Non-goals

- Replacing the human interviewer
- Helping the candidate (this is interviewer-facing only)
- Working on Zoom or Teams (Google Meet only)
- Working with anything other than English audio
- Supporting non-technical interviews (behavioral, culture, sales)
