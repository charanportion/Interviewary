// Client-side interview engine. This is the former backend (backend/src/ws.ts +
// sessions.ts) ported into the side panel: it owns the in-memory session,
// drives Deepgram, runs the two agents on each candidate turn, and synthesizes
// the report at the end.
//
// Instead of pushing JSON over a WebSocket, it "emits" by calling the store's
// handleServerMessage directly — so the existing ServerMessage protocol and all
// the views keep working unchanged.

import type {
  AppSettings,
  InterviewType,
  Seniority,
  ServerMessage,
  Session,
  TranscriptTurn,
} from '@interview-copilot/shared';
import type { LanguageModel } from 'ai';
import { useStore } from '../sidepanel/store';
import { getModel } from './llm';
import { openDeepgramLive, type DeepgramLiveSession } from './deepgramLive';
import {
  generateFollowupQuestions,
  generateStartingQuestions,
} from './agents/questionGenerator';
import { evaluateAnswer } from './agents/answerEvaluator';
import { generateReport } from './agents/report';
import { track } from './analytics';

export interface InterviewSetup {
  jd: string;
  resume: string;
  seniority: Seniority;
  interviewType: InterviewType;
}

interface EngineState {
  session: Session;
  settings: AppSettings;
  fastModel: LanguageModel;
  dg: DeepgramLiveSession | null;
}

let state: EngineState | null = null;

function emit(msg: ServerMessage): void {
  useStore.getState().handleServerMessage(msg);
}

export function startInterview(setup: InterviewSetup, settings: AppSettings): void {
  const session: Session = {
    id: crypto.randomUUID(),
    startedAt: new Date(),
    jd: setup.jd,
    resume: setup.resume,
    seniority: setup.seniority,
    interviewType: setup.interviewType,
    transcript: [],
    suggestedQuestions: [],
    evaluations: [],
    askedQuestionIds: [],
  };

  const fastModel = getModel(settings, 'fast');
  state = { session, settings, fastModel, dg: null };

  // Only the candidate is transcribed — tab audio in the interviewer's browser
  // is the candidate's voice coming back through Meet.
  state.dg = openDeepgramLive({
    apiKey: settings.deepgramKey,
    speaker: 'candidate',
    onTurn: handleTurn,
    onError: (err) => emit({ type: 'ERROR', message: `Transcription: ${err.message}` }),
  });

  emit({ type: 'SESSION_STARTED', sessionId: session.id });

  void track({
    event: 'interview_started',
    settings,
    sessionId: session.id,
    properties: {
      seniority: setup.seniority,
      interviewType: setup.interviewType,
      provider: settings.provider,
      fastModel: settings.fastModel,
    },
  });

  // Fire-and-forget: starting questions stream in while the interview proceeds.
  generateStartingQuestions(
    fastModel,
    {
      jd: setup.jd,
      resume: setup.resume,
      seniority: setup.seniority,
      interviewType: setup.interviewType,
    },
    (questions) => {
      session.suggestedQuestions = questions;
      emit({ type: 'QUESTIONS_GENERATED', questions, replace: true });
    },
  ).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: 'ERROR', message: `Question generation: ${message}` });
  });
}

function handleTurn(turn: TranscriptTurn): void {
  if (!state) return;
  state.session.transcript.push(turn);
  emit({ type: 'TRANSCRIPT_TURN', turn });
  if (turn.speaker === 'candidate') runAgentsForTurn(turn);
}

function runAgentsForTurn(turn: TranscriptTurn): void {
  if (!state) return;
  const { session, fastModel, settings } = state;

  // Best-guess question the candidate is responding to: the most recently
  // "Mark asked"-flagged suggestion. Null → evaluator judges on its own merits.
  const askedTexts = session.askedQuestionIds
    .map((id) => session.suggestedQuestions.find((q) => q.id === id)?.text)
    .filter((t): t is string => typeof t === 'string');
  const questionAsked = askedTexts[askedTexts.length - 1] ?? null;

  const allButCurrent = session.transcript.slice(0, -1);
  const precedingContext = allButCurrent.slice(-4);
  const recentTranscript = session.transcript.slice(-6);

  const evalPromise = evaluateAnswer(
    fastModel,
    {
      jd: session.jd,
      seniority: session.seniority,
      questionAsked,
      candidateAnswer: turn.text,
      precedingContext,
      candidateTurnId: turn.id,
    },
    (evaluation) => {
      const idx = session.evaluations.findIndex((e) => e.id === evaluation.id);
      if (idx >= 0) session.evaluations[idx] = evaluation;
      else session.evaluations.push(evaluation);
      emit({ type: 'EVALUATION', evaluation });
      void track({
        event: 'answer_evaluated',
        settings,
        sessionId: session.id,
        properties: { rating: evaluation.rating },
      });
    },
  );

  const followupPromise = generateFollowupQuestions(
    fastModel,
    {
      jd: session.jd,
      resume: session.resume,
      seniority: session.seniority,
      recentTranscript,
      alreadyAsked: askedTexts,
      seed: turn.id,
      transcriptIndex: session.transcript.length,
    },
    (questions) => {
      for (const q of questions) {
        const idx = session.suggestedQuestions.findIndex((sq) => sq.id === q.id);
        if (idx >= 0) session.suggestedQuestions[idx] = q;
        else session.suggestedQuestions.unshift(q);
      }
      emit({ type: 'QUESTIONS_GENERATED', questions, replace: false });
    },
  );

  Promise.all([evalPromise, followupPromise]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: 'ERROR', message: `Agent: ${message}` });
  });
}

export function pushAudio(chunk: Blob | ArrayBuffer): void {
  state?.dg?.send(chunk);
}

export function markQuestionAsked(questionId: string): void {
  if (!state) return;
  if (!state.session.askedQuestionIds.includes(questionId)) {
    state.session.askedQuestionIds.push(questionId);
  }
}

export function endInterview(): void {
  if (!state) return;
  const { session, settings } = state;
  state.dg?.close();
  state.dg = null;

  void track({
    event: 'interview_ended',
    settings,
    sessionId: session.id,
    properties: {
      turns: session.transcript.length,
      evaluations: session.evaluations.length,
      durationMs: Date.now() - session.startedAt.getTime(),
    },
  });

  const reportModel = getModel(settings, 'report');
  generateReport(reportModel, session)
    .then((markdown) => {
      emit({ type: 'REPORT_READY', markdown });
      void track({ event: 'report_generated', settings, sessionId: session.id });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      // Still send a report so the UI leaves the "generating" state.
      const fallback = `# Interview Report — Generation Failed\n\nThe report generator errored: ${message}\n\nPaste your transcript and evaluations into a fresh prompt manually if you need the writeup.`;
      emit({ type: 'REPORT_READY', markdown: fallback });
      emit({ type: 'ERROR', message: `Report: ${message}` });
    })
    .finally(() => {
      state = null;
    });
}
