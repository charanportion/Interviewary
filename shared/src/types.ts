// Single source of truth for the protocol shared by extension and backend.
// Mirrors docs/ARCHITECTURE.md → "Session state shape" and "WebSocket message protocol".

export type Seniority = 'junior' | 'mid' | 'senior';
export type InterviewType = 'screening' | 'deep_dive';
export type Speaker = 'interviewer' | 'candidate';
export type Rating = 'weak' | 'adequate' | 'strong' | 'exceptional';

// ───────── BYO-key settings (stored client-side in chrome.storage.local) ─────────
// The extension is fully serverless: the user supplies their own Deepgram key
// and an LLM provider + key + models. Nothing is hosted by us.
export type LlmProvider = 'anthropic' | 'openai' | 'google' | 'xai';

export interface AppSettings {
  deepgramKey: string;
  provider: LlmProvider;
  llmKey: string;
  // Model id used for the live agents (suggestions + evaluation). Must be fast
  // enough to keep the ~2s latency budget.
  fastModel: string;
  // Model id used for the one-shot end-of-call report. Quality over latency.
  reportModel: string;
  // Opt-in (default false): send anonymous usage events (no transcripts,
  // answers, keys, or candidate data) to help improve the product.
  analyticsConsent?: boolean;
}

export interface TranscriptTurn {
  id: string;
  speaker: Speaker;
  text: string;
  startMs: number;
  endMs: number;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  topic: string;
  rationale: string;
  generatedAt: number;
  asked: boolean;
}

export interface AnswerEvaluation {
  id: string;
  candidateTurnId: string;
  rating: Rating;
  evidence: string;
  topics: string[];
}

export interface Session {
  id: string;
  startedAt: Date;
  jd: string;
  resume: string;
  seniority: Seniority;
  interviewType: InterviewType;
  transcript: TranscriptTurn[];
  suggestedQuestions: SuggestedQuestion[];
  evaluations: AnswerEvaluation[];
  askedQuestionIds: string[];
}

// ───────── Extension → Backend ─────────
export type ClientMessage =
  | {
      type: 'START_INTERVIEW';
      jd: string;
      resume: string;
      seniority: Seniority;
      interviewType: InterviewType;
    }
  | { type: 'MARK_QUESTION_ASKED'; questionId: string }
  | { type: 'END_INTERVIEW' }
  | { type: 'PING' };

// ───────── Backend → Extension ─────────
export type ServerMessage =
  | { type: 'SESSION_STARTED'; sessionId: string }
  | { type: 'TRANSCRIPT_TURN'; turn: TranscriptTurn }
  | { type: 'QUESTIONS_GENERATED'; questions: SuggestedQuestion[]; replace: boolean }
  | { type: 'EVALUATION'; evaluation: AnswerEvaluation }
  | { type: 'REPORT_READY'; markdown: string }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };
