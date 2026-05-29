import { z } from 'zod';

// Per docs/AGENTS.md — matches both 'start' and 'followup' modes of the
// Question Generator. The .describe() calls are load-bearing: they're what
// steer Claude's JSON output via Vercel AI SDK's streamObject.
export const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z
          .string()
          .describe(
            'The interview question, phrased as the interviewer should ask it. Conversational tone, one question per item.',
          ),
        topic: z
          .string()
          .describe(
            'Short topic tag, e.g. "React state management", "SQL indexing", "system design".',
          ),
        rationale: z
          .string()
          .describe(
            'One sentence: why this question now, and what a strong answer looks like. The non-technical interviewer reads this to know what to listen for.',
          ),
      }),
    )
    .min(2)
    .max(7),
});

export type QuestionsOutput = z.infer<typeof QuestionsSchema>;

// Per docs/AGENTS.md → Answer Evaluator output schema.
// rating + evidence are what the side panel surfaces as a badge under each
// candidate turn. topics are kept for the end-of-call report. The two extra
// AGENTS.md fields (technicalAccuracy, depthSignal) are intentionally omitted
// to keep the schema small and the latency low — they can be added later if
// the report needs richer signal.
export const EvaluationSchema = z.object({
  rating: z
    .enum(['weak', 'adequate', 'strong', 'exceptional'])
    .describe(
      'Overall quality of the answer for the target seniority. Adequate is the normal answer; strong/exceptional require specific evidence.',
    ),
  evidence: z
    .string()
    .describe(
      'One sentence quoting or tightly paraphrasing the specific moment that justifies the rating. Cite the candidate.',
    ),
  topics: z
    .array(z.string())
    .describe('1-3 short topic tags this answer touched on.'),
});

export type EvaluationOutput = z.infer<typeof EvaluationSchema>;
