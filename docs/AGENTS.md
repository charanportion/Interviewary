# Agents

Two agents. Both use Vercel AI SDK `streamObject`. Both use Claude Haiku 4.5 for the prototype.

If quality is visibly weak in dry runs, upgrade the relevant agent to Claude Sonnet 4. Do not upgrade preemptively.

## Agent 1: Question Generator

**File:** `backend/src/agents/questionGenerator.ts`

### Purpose

Generate technical interview questions in two modes:
- **Starting questions** (mode: `'start'`) — 5–7 opening questions, called once on session start
- **Follow-up questions** (mode: `'followup'`) — 2–3 questions based on the candidate's most recent answer, called after each candidate turn

### When called

- On `START_INTERVIEW` message: mode `'start'`
- After each candidate turn lands in the session: mode `'followup'`

### Input

```typescript
type QuestionGenInput = {
  mode: 'start' | 'followup';
  jd: string;
  resume: string;
  seniority: 'junior' | 'mid' | 'senior';
  interviewType: 'screening' | 'deep_dive';
  transcript?: TranscriptTurn[];        // present in followup mode
  alreadyAsked?: string[];              // question texts to avoid repeating
}
```

### Output schema (Zod)

```typescript
import { z } from 'zod';

export const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      text: z.string().describe('The interview question, phrased as the interviewer should ask it. Conversational tone, one question per item.'),
      topic: z.string().describe('Short topic tag, e.g. "React state management", "SQL indexing", "system design".'),
      rationale: z.string().describe('One sentence: why this question now, and what a strong answer looks like. The non-technical interviewer reads this to know what to listen for.'),
    })
  ).min(2).max(7),
});
```

### Prompt (mode: `'start'`)

```
You are helping a non-technical recruiter conduct a technical interview.
Your job is to suggest 5-7 strong opening questions based on the job description and candidate resume.

# Job Description
{jd}

# Candidate Resume
{resume}

# Role context
- Seniority target: {seniority}
- Interview type: {interviewType}

# Guidance
- Start with one warm-up question grounded in the candidate's most recent role
- Include 2-3 questions on the core technical skills the JD requires
- Include 1-2 questions that probe depth on something specific the candidate claims (named project, technology, or achievement)
- For a {seniority} candidate in a {interviewType} interview, calibrate difficulty appropriately:
  - junior: fundamentals, "explain how X works", small debugging scenarios
  - mid: design tradeoffs, "when would you use X over Y", real-world problem solving
  - senior: system design, technical leadership decisions, "tell me about a time you made a wrong technical call"
- Each question must be specific enough that the rationale can tell the recruiter what a strong vs weak answer sounds like
- Avoid trivia. Avoid LeetCode-style algorithm puzzles unless the JD specifically requires algorithm work.

Output the questions in the order they should be asked. The rationale field is critical — it is what the non-technical interviewer reads to evaluate the answer.
```

### Prompt (mode: `'followup'`)

```
You are helping a non-technical recruiter conduct a technical interview.
The candidate just gave an answer. Suggest 2-3 follow-up questions based on what they said.

# Job Description
{jd}

# Candidate Resume (excerpt)
{resume}

# Role context
- Seniority target: {seniority}

# Recent transcript (last 6 turns)
{recentTranscript}

# Questions already asked
{alreadyAsked}

# Guidance
- The candidate's latest answer is the anchor. Probe it.
- If they made a specific technical claim, ask one question that would distinguish someone who actually knows it from someone who's heard the terms.
- If they were vague, ask one question that forces specificity.
- If they were strong, ask one question that goes one level deeper.
- Do NOT repeat any question already asked.
- Do NOT switch topics unless they completely fumbled the answer.
- Each question's rationale should explicitly say "if they answer X, that's senior-level; if they answer Y, that's a red flag" or similar concrete framing.

Output 2-3 follow-up questions, ordered by which to ask next.
```

### Implementation sketch

```typescript
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { QuestionsSchema } from './schemas';

export async function generateQuestions(
  input: QuestionGenInput,
  onPartial: (questions: Partial<z.infer<typeof QuestionsSchema>>) => void,
) {
  const prompt = input.mode === 'start' ? buildStartPrompt(input) : buildFollowupPrompt(input);

  const { partialObjectStream } = streamObject({
    model: anthropic('claude-haiku-4-5'),
    schema: QuestionsSchema,
    prompt,
  });

  let final: any;
  for await (const partial of partialObjectStream) {
    onPartial(partial);
    final = partial;
  }
  return final;
}
```

### Latency target

- Start mode: <3s (acceptable since user is uploading files anyway)
- Followup mode: <1.5s for first partial, <3s for complete

---

## Agent 2: Answer Evaluator

**File:** `backend/src/agents/answerEvaluator.ts`

### Purpose

After each candidate turn, evaluate the quality of the answer and produce a one-line evidence quote. This is what closes the loop for the non-technical interviewer — it tells them whether the answer they just heard was good.

### When called

After every candidate turn, in parallel with the Question Generator follow-up call.

### Input

```typescript
type AnswerEvalInput = {
  jd: string;
  seniority: 'junior' | 'mid' | 'senior';
  questionAsked: string | null;        // best-guess question the candidate is responding to
  candidateAnswer: string;             // the candidate turn text
  precedingContext: TranscriptTurn[];  // last 4 turns for context
}
```

The `questionAsked` field is filled by a simple heuristic on the backend: the most recent interviewer turn before this candidate turn. If no interviewer turn exists, pass `null`.

### Output schema (Zod)

```typescript
export const EvaluationSchema = z.object({
  rating: z.enum(['weak', 'adequate', 'strong', 'exceptional']).describe('Overall quality of the answer for a {seniority}-level candidate.'),
  evidence: z.string().describe('One sentence quoting or paraphrasing the specific moment that justifies the rating. Cite the candidate.'),
  topics: z.array(z.string()).describe('1-3 short topic tags this answer touched on.'),
  technicalAccuracy: z.enum(['accurate', 'mostly_accurate', 'inaccurate', 'unverifiable']).describe('Was what they said technically correct?'),
  depthSignal: z.enum(['surface', 'working_knowledge', 'deep']).describe('Did they demonstrate understanding beyond buzzwords?'),
});
```

### Prompt

```
You are evaluating a candidate's answer in a technical interview.
Your evaluation will be shown to a non-technical recruiter who cannot judge the answer themselves.

# Role context
- Seniority target: {seniority}
- Job description (excerpt):
{jd}

# Question asked
{questionAsked}

# Preceding conversation
{precedingContext}

# Candidate's answer
"{candidateAnswer}"

# How to rate

For a {seniority}-level candidate:

- **weak**: factually wrong, incoherent, evasive, or showed they don't understand the topic. Buzzwords without substance.
- **adequate**: technically correct but shallow. They know the surface; you can't tell if they know the depth. Memorized-sounding.
- **strong**: technically correct AND showed real understanding through specifics, tradeoffs, or a concrete example from their own work.
- **exceptional**: strong, plus they volunteered insight (a non-obvious tradeoff, a related problem, a way they were wrong in the past and learned). Senior signal.

# Calibration rules

- Do NOT inflate ratings. "Adequate" is a normal answer. Most answers should be adequate.
- "Strong" and "exceptional" require specific evidence; if you can't point to a sentence, it's not strong.
- For a junior candidate, "explained the concept correctly" can be strong. For a senior, the same answer is adequate.
- If the answer is too short to evaluate (under ~10 words), rate it weak with evidence "answer too brief to evaluate."

# Output

The `evidence` field is critical. Quote or tightly paraphrase the specific words that drove your rating. The recruiter will read this to understand why you rated it that way.
```

### Implementation sketch

Same shape as Question Generator — `streamObject`, Haiku model, partial-streaming callback.

### Latency target

- <1.5s for first partial, <2.5s for complete

---

## Report Generator (one-shot, not an agent in the same sense)

**File:** `backend/src/report.ts`

### Purpose

End-of-call synthesis. Produces the markdown report that gets downloaded.

### Model

Claude Sonnet 4. (Sonnet, not Haiku, because this is one call per interview, runs after the call ends, and quality matters more than latency.)

### Input

The full `Session` object.

### Output

A markdown string with this structure:

```markdown
# Interview Report — {candidate name or "Candidate"}

**Date:** {date}
**Role:** {role from JD}
**Seniority target:** {seniority}
**Duration:** {minutes} minutes

## Summary

{2-3 sentences: who is this candidate, how did they do overall, what's the hire/no-hire signal}

## Overall recommendation

**{Strong Hire | Hire | Lean No | No Hire}** — {one sentence rationale}

## Question-by-question

### Q1: {question text}
**Rating:** {rating}
**What they said:** {2-3 sentence summary of their answer}
**Evidence:** {the one-line evidence from the live eval}

(repeat for each Q&A pair)

## Strengths

- {bullet}
- {bullet}

## Concerns

- {bullet}
- {bullet}

## Recommended next steps

{2-3 sentences: what to probe in round two, who should run that round, any red flags to verify}
```

### Prompt sketch

```
You are writing a hiring report for a {seniority} {role} candidate based on a technical interview transcript and live evaluations from the call.

# Job Description
{jd}

# Resume
{resume}

# Full transcript
{transcript}

# Live evaluations (already produced during the call)
{evaluations}

Write the report in the exact format below. Be specific and evidence-based. Cite the transcript when making claims. The reader is a hiring manager who did not attend the interview.

{template}
```

Use `generateText`, not `streamObject` (we want a single markdown blob, not structured JSON).

---

## Cost estimate per interview

Assuming a 45-minute interview with ~6 candidate turns:

| Call | Model | Approx tokens (in / out) | Cost |
|---|---|---|---|
| Question Gen (start) | Haiku | 3K / 800 | $0.007 |
| Question Gen (followup) × 6 | Haiku | 2K / 400 each | $0.02 |
| Answer Evaluator × 6 | Haiku | 2K / 200 each | $0.012 |
| Report (end of call) | Sonnet 4 | 8K / 2K | $0.054 |
| **Total** | | | **~$0.09** |

Plus Deepgram at ~$0.40 per 45-min interview (covered by their $200 free credit during prototyping).

30 test interviews ≈ $3 in LLM costs.
