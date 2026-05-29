import { randomUUID } from 'node:crypto';
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type {
  AnswerEvaluation,
  Rating,
  Seniority,
  TranscriptTurn,
} from '@interview-copilot/shared';
import { EvaluationSchema } from './schemas.js';

export interface EvaluateAnswerInput {
  jd: string;
  seniority: Seniority;
  // Best-guess question the candidate is responding to. Filled from the
  // most recently "Mark asked"-clicked suggestion text, or null if the
  // recruiter is going off-script.
  questionAsked: string | null;
  candidateAnswer: string;
  // Last few turns for context (excluding the turn being evaluated).
  precedingContext: TranscriptTurn[];
  // The turn this evaluation applies to. Used to link the eval back to its
  // candidate turn so the side panel renders the badge in the right place.
  candidateTurnId: string;
}

export async function evaluateAnswer(
  input: EvaluateAnswerInput,
  onPartial: (evaluation: AnswerEvaluation) => void,
): Promise<AnswerEvaluation | null> {
  const prompt = buildPrompt(input);

  const { partialObjectStream } = streamObject({
    model: anthropic('claude-haiku-4-5'),
    schema: EvaluationSchema,
    prompt,
  });

  // One id per evaluation call — partials stream with the same id so the
  // extension overwrites in place rather than appending duplicates.
  const id = randomUUID();
  let latest: AnswerEvaluation | null = null;

  for await (const partial of partialObjectStream) {
    if (!partial) continue;
    const rating = partial.rating;
    const evidence = partial.evidence;
    if (!isValidRating(rating) || !isNonEmpty(evidence)) continue;

    const topics = Array.isArray(partial.topics)
      ? partial.topics.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    latest = {
      id,
      candidateTurnId: input.candidateTurnId,
      rating,
      evidence,
      topics,
    };
    onPartial(latest);
  }
  return latest;
}

function isValidRating(r: unknown): r is Rating {
  return r === 'weak' || r === 'adequate' || r === 'strong' || r === 'exceptional';
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

function buildPrompt(input: EvaluateAnswerInput): string {
  const jdExcerpt = input.jd.slice(0, 2000);
  const precedingContext = input.precedingContext.length
    ? input.precedingContext
        .map((t) => `${t.speaker === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`)
        .join('\n')
    : '(no prior turns)';
  const question = input.questionAsked ?? '(no specific question marked as asked — evaluate the answer on its own merits)';

  return `You are evaluating a candidate's answer in a technical interview.
Your evaluation will be shown to a non-technical recruiter who cannot judge the answer themselves.

# Role context
- Seniority target: ${input.seniority}
- Job description (excerpt):
${jdExcerpt}

# Question asked
${question}

# Preceding conversation
${precedingContext}

# Candidate's answer
"${input.candidateAnswer}"

# How to rate

For a ${input.seniority}-level candidate:

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

The \`evidence\` field is critical. Quote or tightly paraphrase the specific words that drove your rating. The recruiter will read this to understand why you rated it that way.`;
}
