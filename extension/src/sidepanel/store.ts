import { create } from 'zustand';
import type {
  AnswerEvaluation,
  AppSettings,
  InterviewType,
  Seniority,
  ServerMessage,
  SuggestedQuestion,
  TranscriptTurn,
} from '@interview-copilot/shared';
import { emptySettings, hasValidSettings } from '../lib/settings';

export type Phase = 'setup' | 'interview' | 'settings' | 'report';
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

  // BYO-key settings (loaded from chrome.storage.local on startup)
  settings: AppSettings;
  settingsLoaded: boolean;
  // Where to return when leaving the settings screen ('setup' or 'interview').
  settingsReturnPhase: Exclude<Phase, 'settings'>;

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

  // The finished report. Kept (along with the session data) so the report
  // screen can render charts + narrative; cleared on finishReport().
  reportMarkdown?: string;
  reportGeneratedAtMs?: number;

  // setters
  setJd: (text: string, fileName?: string) => void;
  setResume: (text: string, fileName?: string) => void;
  setSeniority: (s: Seniority) => void;
  setInterviewType: (t: InterviewType) => void;
  setAudioStatus: (s: AudioStatus, error?: string) => void;
  setReportStatus: (s: ReportStatus) => void;
  dismissError: (index: number) => void;

  // settings
  setSettings: (s: AppSettings) => void;
  applyLoadedSettings: (s: AppSettings) => void;
  openSettings: () => void;
  closeSettings: () => void;

  // server message dispatch (called by ws client)
  handleServerMessage: (msg: ServerMessage) => void;

  // setup actions
  markAsked: (questionId: string) => void;
  resetSession: () => void;
  // Leave the report screen and start fresh.
  finishReport: () => void;
  beginInterview: () => void;
}

const initialSessionState = {
  sessionId: undefined,
  interviewStartMs: undefined,
  transcript: [] as TranscriptTurn[],
  suggestedQuestions: [] as SuggestedQuestion[],
  evaluations: [] as AnswerEvaluation[],
  askedQuestionIds: [] as string[],
  reportMarkdown: undefined as string | undefined,
  reportGeneratedAtMs: undefined as number | undefined,
};

export const useStore = create<AppState>((set, get) => ({
  phase: 'setup',
  jd: '',
  resume: '',
  seniority: 'mid',
  interviewType: 'screening',

  ...initialSessionState,

  settings: emptySettings(),
  settingsLoaded: false,
  settingsReturnPhase: 'setup',
  audioStatus: 'idle',
  audioError: undefined,
  serverErrors: [],
  newQuestionIds: [],
  reportStatus: 'idle',

  setJd: (text, fileName) => set({ jd: text, jdFileName: fileName }),
  setResume: (text, fileName) => set({ resume: text, resumeFileName: fileName }),
  setSeniority: (s) => set({ seniority: s }),
  setInterviewType: (t) => set({ interviewType: t }),
  setAudioStatus: (s, error) => set({ audioStatus: s, audioError: error }),
  setReportStatus: (s) => set({ reportStatus: s }),
  dismissError: (index) =>
    set((state) => ({
      serverErrors: state.serverErrors.filter((_, i) => i !== index),
    })),

  setSettings: (s) => set({ settings: s }),

  // Called once on startup after reading chrome.storage.local. If keys are
  // missing we land on the settings screen; otherwise the normal setup screen.
  applyLoadedSettings: (s) =>
    set((state) => ({
      settings: s,
      settingsLoaded: true,
      phase: hasValidSettings(s) ? state.phase : 'settings',
    })),

  openSettings: () =>
    set((state) => ({
      phase: 'settings',
      settingsReturnPhase: state.phase === 'settings' ? state.settingsReturnPhase : state.phase,
    })),

  closeSettings: () => set((state) => ({ phase: state.settingsReturnPhase })),

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

  finishReport: () =>
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
        // Keep the session data; show it on the report screen with charts +
        // narrative and explicit download buttons (no auto-download).
        set({
          reportMarkdown: msg.markdown,
          reportGeneratedAtMs: Date.now(),
          reportStatus: 'idle',
          phase: 'report',
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
