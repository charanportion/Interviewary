# Demo Script

The goal is to validate, in under 15 minutes, that the founder wants this product.

## Pre-demo checklist (30 min before)

- [ ] Backend running, no errors in logs
- [ ] Extension loaded in Chrome (unpacked, latest build)
- [ ] Anthropic API key has budget (check console)
- [ ] Deepgram API key has budget (check console)
- [ ] Wi-Fi is solid (test with a speedtest — agent latency depends on it)
- [ ] One JD ready in PDF, ideally for a role similar to what the founder hires for
- [ ] One resume ready in PDF, ideally a realistic candidate (not a fake one)
- [ ] A friend on standby to play the candidate (live in another Meet from a different machine)
- [ ] Backup: a pre-recorded mock interview video you can play in another Meet if the live candidate falls through
- [ ] Close Slack, email, anything that might notify mid-demo
- [ ] Test the full flow once 10 minutes before, then close everything

## The demo (target: 10 minutes)

### Intro (1 min)
"You told me you're running technical interviews with non-technical staff and the results aren't great — false positives, candidates who pass the screen then bomb with engineering. I built a prototype that addresses this. Want to see it?"

(Wait for buy-in. If they're not bought in, the demo will fall flat.)

### Setup (1 min)
1. Open a Google Meet (a real one, not a fake URL)
2. Have your friend join from another machine
3. Open the extension side panel
4. Show the upload screen
5. Drag and drop the JD PDF, then the resume PDF — let them see the preview
6. Pick seniority and interview type
7. Click Start Interview

### Starting questions appear (30 sec)
- Let the questions stream in
- Read the first one aloud, then point at the rationale: "See, this is what tells me — as someone who doesn't know React — what a strong answer should sound like."

### Live interview (4–5 min)
- Ask the first question. Friend answers (briefed beforehand to give an "adequate" answer first).
- Point at the transcript appearing live
- When the answer completes, the evaluation badge appears — read it aloud
- New follow-ups appear — pick one and ask it
- Friend answers (briefed to give a "strong" answer this time, with specifics)
- Evaluation: probably "strong" — show that the system caught the difference
- Ask one more follow-up
- Friend gives a "weak" answer (something memorized-sounding)
- Evaluation catches it — point at the evidence field

**Key beat:** stop and say: "Without this, you'd have nodded through all three of those and given them all the same score in your head."

### End + report (1.5 min)
1. Click End Interview
2. Report downloads automatically
3. Open it, scroll through:
   - Show the summary
   - Show one Q&A entry with evidence
   - Show the recommendation
4. "This is what you'd hand to the engineering manager for round two."

### Discussion (3–4 min)
Don't sell. Ask:
1. "What's your gut reaction?"
2. "What's missing for this to be useful to you specifically?"
3. "How many technical screens does your team run per week?"
4. "What's your current false-positive rate? Candidates you screen-pass who then fail engineering?"
5. "Would you pilot this on a real interview in the next two weeks if I gave you access?"

That last question is the validation. Yes = design partner. Hedging = the pain isn't acute enough.

## If something breaks mid-demo

- **WS disconnects:** stay calm, click End and restart from the upload screen. You lose ~30 seconds.
- **No transcript appearing:** check that the Meet tab is still the active one. Tab capture loses focus if you switch tabs.
- **Agent calls fail / slow:** "This is a prototype on my laptop — production would be 2x faster on real infrastructure." Then continue.
- **Browser asks for permissions you forgot:** grant them, restart the session. You lose ~1 minute.
- **The whole thing breaks:** open the pre-recorded mock interview video, pivot to showing the report from a prior dry run. "Let me show you what the output looks like instead — here's a report from a mock we ran yesterday."

## What you're listening for

The founder's body language and word choice tell you more than the questions you ask.

- **Strong signal:** they interrupt to ask "can I try this on a real interview?" or "how much would this cost?"
- **Moderate signal:** they ask about specific features ("does it work with Zoom?" "can it grade culture fit?") — they're imagining using it
- **Weak signal:** they say "interesting" and ask polite questions, or say "neat, send me the deck" — they're being nice
- **Bad signal:** they push back on the premise ("but my recruiter is technical enough" / "we don't really have this problem") — the pain isn't real, or you misunderstood it

If you get a weak or bad signal, don't argue. Thank them and ask what would make it actually useful. The post-demo conversation is more valuable than the demo itself.

## After the demo

Same day:
1. Send a one-paragraph thank-you with a link to download the report from the demo
2. Note their exact words on the strongest reaction — that's your wedge for v2
3. If they said yes to a pilot: schedule it within 7 days; cooling interest is the enemy
4. Update `docs/PRD.md` with anything new you learned about ICP / pain / pricing
