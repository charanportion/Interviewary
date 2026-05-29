import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type {
  InterviewType,
  Seniority,
  SuggestedQuestion,
  TranscriptTurn,
} from '@interview-copilot/shared';
import { QuestionsSchema } from './schemas.js';

export interface StartModeInput {
  jd: string;
  resume: string;
  seniority: Seniority;
  interviewType: InterviewType;
}

export interface FollowupModeInput {
  jd: string;
  resume: string;
  seniority: Seniority;
  recentTranscript: TranscriptTurn[];
  alreadyAsked: string[];
  // Unique seed so question IDs are stable within one followup call but
  // unique across multiple followups. The turn id is a good seed.
  seed: string;
  // Used as `generatedAt` on each question so the report can correlate
  // questions back to where in the conversation they were suggested.
  transcriptIndex: number;
}

// Phase 4: generate 5–7 starting questions from JD + resume.
// Phase 5 will add the 'followup' mode (separate function).
export async function generateStartingQuestions(
  input: StartModeInput,
  onPartial: (questions: SuggestedQuestion[]) => void,
): Promise<SuggestedQuestion[]> {
  const prompt = buildStartPrompt(input);

  const { partialObjectStream } = streamObject({
    // Per docs/AGENTS.md — Haiku 4.5 for both agents during prototyping.
    model: anthropic('claude-haiku-4-5'),
    schema: QuestionsSchema,
    prompt,
  });

  let latest: SuggestedQuestion[] = [];
  for await (const partial of partialObjectStream) {
    const items = partial?.questions ?? [];
    latest = items
      .filter(isUsableQuestion)
      .map((q, idx) => ({
        // Position-stable IDs so the React side can dedupe across partials.
        id: `start-${idx}`,
        text: q.text,
        topic: q.topic,
        rationale: q.rationale,
        generatedAt: 0,
        asked: false,
      }));
    if (latest.length > 0) onPartial(latest);
  }
  return latest;
}

type PartialQuestion = { text?: string; topic?: string; rationale?: string } | undefined;

function isUsableQuestion(
  q: PartialQuestion,
): q is { text: string; topic: string; rationale: string } {
  return (
    !!q &&
    typeof q.text === 'string' &&
    q.text.trim().length > 0 &&
    typeof q.topic === 'string' &&
    q.topic.trim().length > 0 &&
    typeof q.rationale === 'string' &&
    q.rationale.trim().length > 0
  );
}

// Phase 5: generate 2–3 follow-up questions based on the candidate's most
// recent turn. Called in parallel with the Answer Evaluator after every
// candidate turn.
export async function generateFollowupQuestions(
  input: FollowupModeInput,
  onPartial: (questions: SuggestedQuestion[]) => void,
): Promise<SuggestedQuestion[]> {
  const prompt = buildFollowupPrompt(input);

  const { partialObjectStream } = streamObject({
    model: anthropic('claude-haiku-4-5'),
    schema: QuestionsSchema,
    prompt,
  });

  let latest: SuggestedQuestion[] = [];
  for await (const partial of partialObjectStream) {
    const items = partial?.questions ?? [];
    latest = items
      .filter(isUsableQuestion)
      .map((q, idx) => ({
        // Position-stable WITHIN one followup call (so partials update in
        // place), but unique ACROSS calls thanks to the seed.
        id: `followup-${input.seed}-${idx}`,
        text: q.text,
        topic: q.topic,
        rationale: q.rationale,
        generatedAt: input.transcriptIndex,
        asked: false,
      }));
    if (latest.length > 0) onPartial(latest);
  }
  return latest;
}

function buildStartPrompt(input: StartModeInput): string {
  return `You are helping a non-technical recruiter conduct a technical interview.
Your job is to suggest 5-7 strong opening questions based on the job description and candidate resume.

# Job Description
${input.jd}

# Candidate Resume
${input.resume}

# Role context
- Seniority target: ${input.seniority}
- Interview type: ${input.interviewType}

# Guidance
- Start with one warm-up question grounded in the candidate's most recent role
- Include 2-3 questions on the core technical skills the JD requires
- Include 1-2 questions that probe depth on something specific the candidate claims (named project, technology, or achievement)
- For a ${input.seniority} candidate in a ${input.interviewType} interview, calibrate difficulty appropriately:
  - junior: fundamentals, "explain how X works", small debugging scenarios
  - mid: design tradeoffs, "when would you use X over Y", real-world problem solving
  - senior: system design, technical leadership decisions, "tell me about a time you made a wrong technical call"
- Each question must be specific enough that the rationale can tell the recruiter what a strong vs weak answer sounds like
- Avoid trivia. Avoid LeetCode-style algorithm puzzles unless the JD specifically requires algorithm work.

Output the questions in the order they should be asked. The rationale field is critical — it is what the non-technical interviewer reads to evaluate the answer.`;
}

function buildFollowupPrompt(input: FollowupModeInput): string {
  const recentTranscript = input.recentTranscript
    .map((t) => `${t.speaker === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`)
    .join('\n');
  const alreadyAsked = input.alreadyAsked.length
    ? input.alreadyAsked.map((q) => `- ${q}`).join('\n')
    : '(none yet)';
  const resumeExcerpt = input.resume.slice(0, 2000);

  return `You are helping a non-technical recruiter conduct a technical interview.
The candidate just gave an answer. Suggest 2-3 follow-up questions based on what they said.

# Job Description
${input.jd}

# Candidate Resume (excerpt)
${resumeExcerpt}

# Role context
- Seniority target: ${input.seniority}

# Recent transcript (last few turns)
${recentTranscript}

# Questions already asked
${alreadyAsked}

# Guidance
- The candidate's latest answer is the anchor. Probe it.
- If they made a specific technical claim, ask one question that would distinguish someone who actually knows it from someone who's heard the terms.
- If they were vague, ask one question that forces specificity.
- If they were strong, ask one question that goes one level deeper.
- Do NOT repeat any question already asked.
- Do NOT switch topics unless they completely fumbled the answer.
- Each question's rationale should explicitly say "if they answer X, that's senior-level; if they answer Y, that's a red flag" or similar concrete framing.

Output 2-3 follow-up questions, ordered by which to ask next.`;
}
