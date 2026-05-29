// Pure analytics derived from the live session data (transcript + per-answer
// evaluations) so the report screen can render charts without re-querying any
// model. Shared by ReportView (on-screen charts) and reportPdf (PDF charts).

import type {
  AnswerEvaluation,
  InterviewType,
  Rating,
  Seniority,
  TranscriptTurn,
} from '@interview-copilot/shared';

export const RATING_ORDER: Rating[] = ['weak', 'adequate', 'strong', 'exceptional'];

export const RATING_LEVEL: Record<Rating, number> = {
  weak: 1,
  adequate: 2,
  strong: 3,
  exceptional: 4,
};

export interface ReportMetrics {
  evaluated: number;
  candidateTurns: number;
  byRating: Record<Rating, number>;
  topics: string[];
  durationMin: number;
  // % of evaluated answers rated strong or exceptional.
  strongRate: number;
  // Mean rating level (1–4), 0 when nothing evaluated.
  averageLevel: number;
  // One entry per evaluated answer, in interview order — drives the timeline.
  timeline: { rating: Rating; level: number }[];
}

export interface ReportInput {
  transcript: TranscriptTurn[];
  evaluations: AnswerEvaluation[];
  seniority: Seniority;
  interviewType: InterviewType;
  startedAtMs?: number;
  endedAtMs?: number;
}

export function computeMetrics(input: ReportInput): ReportMetrics {
  const byRating: Record<Rating, number> = {
    weak: 0,
    adequate: 0,
    strong: 0,
    exceptional: 0,
  };

  const topicSet = new Set<string>();
  const timeline: { rating: Rating; level: number }[] = [];

  // Walk the transcript so the timeline follows interview order.
  const evalByTurn = new Map(input.evaluations.map((e) => [e.candidateTurnId, e]));
  for (const turn of input.transcript) {
    if (turn.speaker !== 'candidate') continue;
    const ev = evalByTurn.get(turn.id);
    if (!ev) continue;
    byRating[ev.rating] += 1;
    timeline.push({ rating: ev.rating, level: RATING_LEVEL[ev.rating] });
    for (const t of ev.topics) {
      const trimmed = t.trim();
      if (trimmed) topicSet.add(trimmed);
    }
  }

  const evaluated = timeline.length;
  const candidateTurns = input.transcript.filter((t) => t.speaker === 'candidate').length;
  const strongCount = byRating.strong + byRating.exceptional;
  const levelSum = timeline.reduce((acc, t) => acc + t.level, 0);

  const durationMin =
    input.startedAtMs && input.endedAtMs
      ? Math.max(1, Math.round((input.endedAtMs - input.startedAtMs) / 60_000))
      : 0;

  return {
    evaluated,
    candidateTurns,
    byRating,
    topics: [...topicSet],
    durationMin,
    strongRate: evaluated ? Math.round((strongCount / evaluated) * 100) : 0,
    averageLevel: evaluated ? levelSum / evaluated : 0,
    timeline,
  };
}

// A short verdict label derived purely from the numbers, used as a headline on
// the report screen (the narrative recommendation still comes from the model).
export function headlineFromLevel(averageLevel: number): { label: string; tone: Rating } {
  if (averageLevel === 0) return { label: 'No answers scored', tone: 'adequate' };
  if (averageLevel >= 3.5) return { label: 'Exceptional', tone: 'exceptional' };
  if (averageLevel >= 2.75) return { label: 'Strong', tone: 'strong' };
  if (averageLevel >= 1.75) return { label: 'Adequate', tone: 'adequate' };
  return { label: 'Weak', tone: 'weak' };
}
