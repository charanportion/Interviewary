import { create } from 'zustand';
import type {
  AnswerEvaluation,
  AppSettings,
  Entitlement,
  InterviewType,
  Seniority,
  ServerMessage,
  SuggestedQuestion,
  TranscriptTurn,
} from '@interview-copilot/shared';
import { emptySettings, hasValidSettings } from '../lib/settings';
import { billingConfigured, resolveLicense } from '../lib/billing';
import { BYOK_BUILD } from '../lib/edition';

export type Phase = 'setup' | 'interview' | 'settings' | 'report' | 'paywall';

// Pre-interview phases the startup gate is allowed to switch between (never
// yanks the user out of an active interview or report).
const PRE_PHASES: Phase[] = ['setup', 'settings', 'paywall'];

/**
 * Is BYOK (bring-your-own-keys) available? Only on the lifetime build AND for a
 * lifetime entitlement. Subscription is credits-only — and a subscription license
 * never unlocks BYOK even if it's running in the lifetime build.
 */
export function byokAvailable(entitlement: Entitlement | null): boolean {
  return BYOK_BUILD && entitlement?.status === 'lifetime';
}

/** Can the user start an interview, given their settings + entitlement? */
export function canStartInterview(settings: AppSettings, entitlement: Entitlement | null): boolean {
  // Billing disabled in this build → original BYOK-only behavior.
  if (!billingConfigured()) return BYOK_BUILD && hasValidSettings(settings);
  if (!entitlement || entitlement.status === 'none') return false;
  // BYOK path only when allowed AND selected; otherwise it's server (credits).
  if (settings.accountMode === 'byok' && byokAvailable(entitlement)) return hasValidSettings(settings);
  return entitlement.creditsRemaining > 0;
}

/** Force server mode whenever BYOK isn't available, so settings can't get stuck. */
function normalizeMode(settings: AppSettings, entitlement: Entitlement | null): AppSettings {
  if (!byokAvailable(entitlement) && settings.accountMode !== 'server') {
    return { ...settings, accountMode: 'server' };
  }
  return settings;
}

/** Target pre-interview phase after a settings/entitlement change. */
function gatePhase(settings: AppSettings, entitlement: Entitlement | null): Phase {
  if (!billingConfigured()) return hasValidSettings(settings) ? 'setup' : 'settings';
  if (!entitlement || entitlement.status === 'none') return 'paywall';
  return canStartInterview(settings, entitlement) ? 'setup' : 'settings';
}
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
  // The candidate turn whose evaluation is currently in flight (anchors the
  // "Evaluating…" hint in the transcript). null when nothing is pending.
  pendingEvalTurnId: string | null;

  // BYO-key settings (loaded from chrome.storage.local on startup)
  settings: AppSettings;
  settingsLoaded: boolean;
  // Where to return when leaving the settings screen ('setup' or 'interview').
  settingsReturnPhase: Exclude<Phase, 'settings'>;

  // Polar entitlement (lifetime/subscription) + credit balance, resolved from
  // the license key. null until checked; entitlementChecked guards the gate.
  entitlement: Entitlement | null;
  entitlementChecked: boolean;

  // audio
  audioStatus: AudioStatus;
  audioError?: string;

  // server-reported errors (e.g. missing Deepgram key, transcription failures)
  serverErrors: string[];

  // True once server-mode credits run out mid-interview (drives the banner).
  creditsExhausted: boolean;

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

  // entitlement / paywall
  setEntitlement: (e: Entitlement | null) => void;
  setCreditsRemaining: (n: number) => void;
  // Re-resolve the license key against the billing server and re-gate the phase.
  refreshEntitlement: () => Promise<void>;
  openPaywall: () => void;

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
  pendingEvalTurnId: null as string | null,
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
  entitlement: null,
  entitlementChecked: false,
  audioStatus: 'idle',
  audioError: undefined,
  serverErrors: [],
  creditsExhausted: false,
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

  // Just stores settings — phase gating happens on closeSettings / startup so we
  // never yank the user out of the Settings screen while they're editing.
  setSettings: (s) => set({ settings: s }),

  // Called once on startup after reading chrome.storage.local. We don't pick the
  // phase here — refreshEntitlement() runs next and gates on entitlement + keys.
  applyLoadedSettings: (s) => set({ settings: s, settingsLoaded: true }),

  setEntitlement: (e) =>
    set((state) => ({ entitlement: e, settings: normalizeMode(state.settings, e) })),

  setCreditsRemaining: (n) =>
    set((state) =>
      state.entitlement
        ? { entitlement: { ...state.entitlement, creditsRemaining: n } }
        : {},
    ),

  refreshEntitlement: async () => {
    const { settings } = get();
    // No billing server baked in → stay pure-BYOK, no paywall.
    if (!billingConfigured()) {
      set((state) => ({
        entitlement: null,
        entitlementChecked: true,
        phase: PRE_PHASES.includes(state.phase) ? gatePhase(settings, null) : state.phase,
      }));
      return;
    }
    let entitlement: Entitlement | null = { status: 'none', creditsRemaining: 0 };
    if (settings.licenseKey.trim()) {
      try {
        const r = await resolveLicense(settings.licenseKey);
        entitlement = r.ok ? r.entitlement : { status: 'none', creditsRemaining: 0 };
      } catch {
        entitlement = null; // network error — don't hard-lock; allow retry from paywall
      }
    }
    set((state) => {
      const normalized = normalizeMode(state.settings, entitlement);
      return {
        entitlement,
        entitlementChecked: true,
        settings: normalized,
        phase: PRE_PHASES.includes(state.phase) ? gatePhase(normalized, entitlement) : state.phase,
      };
    });
  },

  openPaywall: () => set({ phase: 'paywall' }),

  openSettings: () =>
    set((state) => ({
      phase: 'settings',
      settingsReturnPhase:
        state.phase === 'settings' ? state.settingsReturnPhase : (state.phase as Exclude<Phase, 'settings'>),
    })),

  closeSettings: () =>
    set((state) => {
      // If they still can't start, route to the right gate instead of setup.
      const target = PRE_PHASES.includes(state.settingsReturnPhase)
        ? gatePhase(state.settings, state.entitlement)
        : state.settingsReturnPhase;
      return { phase: target };
    }),

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
      creditsExhausted: false,
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
      creditsExhausted: false,
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
          creditsExhausted: false,
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
      case 'EVAL_PENDING': {
        set({ pendingEvalTurnId: msg.turnId });
        return;
      }
      case 'EVALUATION': {
        const s = get();
        const idx = s.evaluations.findIndex((e) => e.id === msg.evaluation.id);
        const next = [...s.evaluations];
        if (idx >= 0) next[idx] = msg.evaluation;
        else next.push(msg.evaluation);
        // The eval landed for the turn we were waiting on — hide the hint.
        const clearPending = s.pendingEvalTurnId === msg.evaluation.candidateTurnId;
        set({
          evaluations: next,
          ...(clearPending ? { pendingEvalTurnId: null } : {}),
        });
        return;
      }
      case 'CREDITS_EXHAUSTED': {
        set({ creditsExhausted: true });
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
