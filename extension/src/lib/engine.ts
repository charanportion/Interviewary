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

// Transient orchestration state for the answer currently being evaluated. Opens
// when a question is marked asked and accumulates the candidate's turns until the
// next question is marked, so one evaluation is produced per asked question.
interface AnswerWindow {
  questionId: string; // the asked question this answer responds to
  evalId: string; // stable id so re-evals of the growing answer update in place
  anchorTurnId: string | null; // first candidate turn after the mark (badge anchor)
  startIndex: number; // session.transcript.length at the moment the question was marked
}

interface EngineState {
  session: Session;
  settings: AppSettings;
  fastModel: LanguageModel;
  dg: DeepgramLiveSession | null;
  answerWindow: AnswerWindow | null;
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
  state = { session, settings, fastModel, dg: null, answerWindow: null };

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

// Minimum word count before an accumulated answer is worth evaluating. Below
// this we wait — single words and short fragments are usually an answer still in
// progress, and evaluating them produces misleading ratings.
const MIN_ANSWER_WORDS = 10;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function runAgentsForTurn(turn: TranscriptTurn): void {
  if (!state) return;

  const evalPromise = evaluateCurrentAnswer(turn);
  const followupPromise = generateFollowups(turn);

  Promise.all([evalPromise, followupPromise]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: 'ERROR', message: `Agent: ${message}` });
  });
}

// Evaluate the answer to the most recently marked question. We accumulate the
// candidate's turns since the question was marked and (re-)evaluate the combined
// answer in place, so there's one evaluation per asked question rather than one
// per transcript turn. No marked question → no evaluation.
function evaluateCurrentAnswer(turn: TranscriptTurn): Promise<unknown> {
  if (!state) return Promise.resolve();
  const { session, fastModel, settings, answerWindow } = state;
  if (!answerWindow) return Promise.resolve();

  // First candidate turn after the question was marked anchors the badge.
  if (answerWindow.anchorTurnId === null) answerWindow.anchorTurnId = turn.id;
  const anchorTurnId = answerWindow.anchorTurnId;

  const answerText = session.transcript
    .slice(answerWindow.startIndex)
    .filter((t) => t.speaker === 'candidate')
    .map((t) => t.text)
    .join(' ');

  // Too short to judge yet — wait for the candidate to say more.
  if (wordCount(answerText) < MIN_ANSWER_WORDS) return Promise.resolve();

  const questionAsked =
    session.suggestedQuestions.find((q) => q.id === answerWindow.questionId)?.text ?? null;
  const precedingContext = session.transcript.slice(0, answerWindow.startIndex).slice(-4);

  emit({ type: 'EVAL_PENDING', turnId: anchorTurnId });

  return evaluateAnswer(
    fastModel,
    {
      jd: session.jd,
      seniority: session.seniority,
      questionAsked,
      candidateAnswer: answerText,
      precedingContext,
      candidateTurnId: anchorTurnId,
      evaluationId: answerWindow.evalId,
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
}

// Followup question suggestions run on every candidate turn, regardless of
// whether a question has been marked asked — they help the recruiter keep going.
function generateFollowups(turn: TranscriptTurn): Promise<unknown> {
  if (!state) return Promise.resolve();
  const { session, fastModel } = state;

  const askedTexts = session.askedQuestionIds
    .map((id) => session.suggestedQuestions.find((q) => q.id === id)?.text)
    .filter((t): t is string => typeof t === 'string');
  const recentTranscript = session.transcript.slice(-6);

  return generateFollowupQuestions(
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
}

export function pushAudio(chunk: Blob | ArrayBuffer): void {
  state?.dg?.send(chunk);
}

export function markQuestionAsked(questionId: string): void {
  if (!state) return;
  if (!state.session.askedQuestionIds.includes(questionId)) {
    state.session.askedQuestionIds.push(questionId);
  }
  // Open a fresh answer window: the candidate's turns from here on are this
  // question's answer, evaluated as one in-place evaluation.
  if (state.answerWindow?.questionId === questionId) return;
  state.answerWindow = {
    questionId,
    evalId: crypto.randomUUID(),
    anchorTurnId: null,
    startIndex: state.session.transcript.length,
  };
  // Clear any stale "Evaluating…" hint from a prior window that never produced
  // an evaluation (e.g. the previous answer stayed too short).
  emit({ type: 'EVAL_PENDING', turnId: null });
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
