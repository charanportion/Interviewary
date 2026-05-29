import { create } from 'zustand';
import type {
  AnswerEvaluation,
  InterviewType,
  Seniority,
  ServerMessage,
  SuggestedQuestion,
  TranscriptTurn,
} from '@interview-copilot/shared';

export type Phase = 'setup' | 'interview';
export type WsStatus = 'disconnected' | 'connecting' | 'open' | 'closed';
export type AudioStatus = 'idle' | 'starting' | 'capturing' | 'error';
export type ReportStatus = 'idle' | 'generating';

export interface AppState {
  // setup
  phase: Phase;
  jd: string;
  jdFileName?: string;
  resume: string;
  resumeFileName?: string;
  seniority: Seniority;
  interviewType: InterviewType;

  // session
  sessionId?: string;
  interviewStartMs?: number;
  transcript: TranscriptTurn[];
  suggestedQuestions: SuggestedQuestion[];
  evaluations: AnswerEvaluation[];
  askedQuestionIds: string[];

  // ws
  wsStatus: WsStatus;

  // audio
  audioStatus: AudioStatus;
  audioError?: string;

  // server-reported errors (e.g. missing Deepgram key, transcription failures)
  serverErrors: string[];

  // Ids of suggested questions added in the last few seconds. SuggestionsPanel
  // shows a "NEW" pill on these; they auto-clear via setTimeout below.
  newQuestionIds: string[];

  // Are we currently waiting for the end-of-call report to come back?
  reportStatus: ReportStatus;

  // setters
  setJd: (text: string, fileName?: string) => void;
  setResume: (text: string, fileName?: string) => void;
  setSeniority: (s: Seniority) => void;
  setInterviewType: (t: InterviewType) => void;
  setWsStatus: (s: WsStatus) => void;
  setAudioStatus: (s: AudioStatus, error?: string) => void;
  setReportStatus: (s: ReportStatus) => void;
  dismissError: (index: number) => void;

  // server message dispatch (called by ws client)
  handleServerMessage: (msg: ServerMessage) => void;

  // setup actions
  markAsked: (questionId: string) => void;
  resetSession: () => void;
  beginInterview: () => void;
}

const initialSessionState = {
  sessionId: undefined,
  interviewStartMs: undefined,
  transcript: [] as TranscriptTurn[],
  suggestedQuestions: [] as SuggestedQuestion[],
  evaluations: [] as AnswerEvaluation[],
  askedQuestionIds: [] as string[],
};

export const useStore = create<AppState>((set, get) => ({
  phase: 'setup',
  jd: '',
  resume: '',
  seniority: 'mid',
  interviewType: 'screening',

  ...initialSessionState,

  wsStatus: 'disconnected',
  audioStatus: 'idle',
  audioError: undefined,
  serverErrors: [],
  newQuestionIds: [],
  reportStatus: 'idle',

  setJd: (text, fileName) => set({ jd: text, jdFileName: fileName }),
  setResume: (text, fileName) => set({ resume: text, resumeFileName: fileName }),
  setSeniority: (s) => set({ seniority: s }),
  setInterviewType: (t) => set({ interviewType: t }),
  setWsStatus: (s) => set({ wsStatus: s }),
  setAudioStatus: (s, error) => set({ audioStatus: s, audioError: error }),
  setReportStatus: (s) => set({ reportStatus: s }),
  dismissError: (index) =>
    set((state) => ({
      serverErrors: state.serverErrors.filter((_, i) => i !== index),
    })),

  beginInterview: () =>
    set({
      phase: 'interview',
      interviewStartMs: Date.now(),
    }),

  resetSession: () =>
    set({
      phase: 'setup',
      ...initialSessionState,
      audioStatus: 'idle',
      audioError: undefined,
      serverErrors: [],
      newQuestionIds: [],
      reportStatus: 'idle',
    }),

  markAsked: (questionId) => {
    const s = get();
    if (s.askedQuestionIds.includes(questionId)) return;
    set({
      askedQuestionIds: [...s.askedQuestionIds, questionId],
      suggestedQuestions: s.suggestedQuestions.map((q) =>
        q.id === questionId ? { ...q, asked: true } : q,
      ),
    });
  },

  handleServerMessage: (msg) => {
    switch (msg.type) {
      case 'SESSION_STARTED': {
        set({
          sessionId: msg.sessionId,
          phase: 'interview',
          interviewStartMs: Date.now(),
        });
        return;
      }
      case 'TRANSCRIPT_TURN': {
        const s = get();
        const existingIdx = s.transcript.findIndex((t) => t.id === msg.turn.id);
        const next = [...s.transcript];
        if (existingIdx >= 0) next[existingIdx] = msg.turn;
        else next.push(msg.turn);
        set({ transcript: next });
        return;
      }
      case 'QUESTIONS_GENERATED': {
        const s = get();
        if (msg.replace) {
          set({ suggestedQuestions: msg.questions });
          return;
        }

        // Streaming partials with replace:false need update-by-id semantics:
        // existing questions are overwritten if the same id arrives again
        // (lets streaming partials refine in place), and ids we've never seen
        // get prepended at the top of the list.
        const incomingById = new Map(msg.questions.map((q) => [q.id, q]));
        const existingIds = new Set(s.suggestedQuestions.map((q) => q.id));
        const updated = s.suggestedQuestions.map((q) => incomingById.get(q.id) ?? q);
        const fresh = msg.questions.filter((q) => !existingIds.has(q.id));

        const newIds = fresh.map((q) => q.id);
        if (newIds.length > 0) {
          set({
            suggestedQuestions: [...fresh, ...updated],
            newQuestionIds: [...s.newQuestionIds, ...newIds],
          });
          // Clear the NEW indicator after a few seconds.
          setTimeout(() => {
            const curr = get();
            const remaining = curr.newQuestionIds.filter((id) => !newIds.includes(id));
            set({ newQuestionIds: remaining });
          }, 6000);
        } else {
          set({ suggestedQuestions: updated });
        }
        return;
      }
      case 'EVALUATION': {
        const s = get();
        const idx = s.evaluations.findIndex((e) => e.id === msg.evaluation.id);
        const next = [...s.evaluations];
        if (idx >= 0) next[idx] = msg.evaluation;
        else next.push(msg.evaluation);
        set({ evaluations: next });
        return;
      }
      case 'REPORT_READY': {
        downloadMarkdown(msg.markdown);
        set({
          phase: 'setup',
          ...initialSessionState,
          audioStatus: 'idle',
          audioError: undefined,
        });
        return;
      }
      case 'ERROR': {
        console.error('Server error:', msg.message);
        const s = get();
        // Dedupe so a repeating error doesn't pile up endlessly.
        if (!s.serverErrors.includes(msg.message)) {
          set({ serverErrors: [...s.serverErrors, msg.message] });
        }
        return;
      }
      case 'PONG':
        return;
    }
  },
}));

function downloadMarkdown(markdown: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-${today}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
