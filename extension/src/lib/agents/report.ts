import { generateText, type LanguageModel } from 'ai';
import type { Session } from '@interview-copilot/shared';

// Single end-of-interview synthesis call. `model` is the user's chosen report
// model (BYO-key) — quality over latency, since it runs once after the call.
export async function generateReport(
  model: LanguageModel,
  session: Session,
): Promise<string> {
  const prompt = buildPrompt(session);
  const { text } = await generateText({
    model,
    prompt,
  });
  return text.trim() + '\n';
}

function buildPrompt(session: Session): string {
  const dateStr = session.startedAt.toISOString().slice(0, 10);
  const durationMin = Math.max(
    1,
    Math.round((Date.now() - session.startedAt.getTime()) / 60_000),
  );
  const askedTexts = session.askedQuestionIds
    .map((id) => session.suggestedQuestions.find((q) => q.id === id)?.text)
    .filter((t): t is string => typeof t === 'string');

  const transcript = session.transcript.length
    ? session.transcript
        .map(
          (t) =>
            `${t.speaker === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`,
        )
        .join('\n')
    : '(no transcript captured)';

  const evaluations = session.evaluations.length
    ? session.evaluations
        .map((e, i) => {
          const turn = session.transcript.find((t) => t.id === e.candidateTurnId);
          const turnText = turn?.text ?? '(turn not found)';
          return `${i + 1}. [${e.rating.toUpperCase()}] Candidate said: "${truncate(turnText, 240)}"\n   Evidence: ${e.evidence}\n   Topics: ${e.topics.join(', ') || '—'}`;
        })
        .join('\n')
    : '(no per-answer evaluations)';

  const askedList = askedTexts.length
    ? askedTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(no questions explicitly marked as asked)';

  return `You are writing a hiring report for a ${session.seniority} candidate based on a technical interview transcript and live per-answer evaluations from the call.

# Job Description
${truncate(session.jd, 4000)}

# Candidate Resume
${truncate(session.resume, 4000)}

# Interview metadata
- Date: ${dateStr}
- Seniority target: ${session.seniority}
- Interview type: ${session.interviewType}
- Approximate duration: ${durationMin} minute(s)

# Questions the interviewer flagged as asked
${askedList}

# Full candidate transcript
${transcript}

# Live per-answer evaluations produced during the call
${evaluations}

# Output format

Write the report in exactly this markdown structure. Be specific and evidence-based. Cite the transcript when making claims. The reader is a hiring manager who did NOT attend the interview.

\`\`\`markdown
# Interview Report — Candidate

**Date:** ${dateStr}
**Seniority target:** ${session.seniority}
**Interview type:** ${session.interviewType}
**Duration:** ${durationMin} minute(s)

## Summary

(2-3 sentences: who is this candidate, how did they do overall, what's the hire/no-hire signal)

## Overall recommendation

**(Strong Hire | Hire | Lean No | No Hire)** — (one sentence rationale)

## Question-by-question

(For each question the interviewer asked OR each substantive candidate answer:)

### Q1: (question text or a one-line summary of what was discussed)
**Rating:** (rating from the live eval, or your inferred rating if no eval)
**What they said:** (2-3 sentence summary of the candidate's answer)
**Evidence:** (the one-line evidence from the live eval, or a direct quote you pulled)

(repeat for each Q&A pair)

## Strengths

- (bullet, evidence-backed)
- (bullet, evidence-backed)

## Concerns

- (bullet, evidence-backed)
- (bullet, evidence-backed)

## Recommended next steps

(2-3 sentences: what to probe in round two, who should run that round, any red flags to verify)
\`\`\`

Output only the markdown report, no preamble, no postscript. Do not wrap in a code block.`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n…(truncated)';
}
