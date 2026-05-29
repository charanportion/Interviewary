import type { FastifyInstance, FastifyBaseLogger } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type {
  ClientMessage,
  ServerMessage,
  TranscriptTurn,
} from '@interview-copilot/shared';
import {
  applyInterviewSetup,
  createSession,
  deleteSession,
} from './sessions.js';
import { openDeepgramSession, type DeepgramSession } from './deepgram.js';
import {
  generateFollowupQuestions,
  generateStartingQuestions,
} from './agents/questionGenerator.js';
import { evaluateAnswer } from './agents/answerEvaluator.js';
import { generateReport } from './report.js';

function send(socket: WebSocket, msg: ServerMessage): void {
  socket.send(JSON.stringify(msg));
}

function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.type !== 'string') return null;
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws', { websocket: true }, (socket, req) => {
    const session = createSession();
    // Only the candidate is transcribed — tab audio in the interviewer's
    // browser is the candidate's voice coming back through Meet. The
    // interviewer's own mic is not captured.
    let candidateDg: DeepgramSession | null = null;
    let chunkCount = 0;
    req.log.info({ sessionId: session.id }, 'WS client connected');

    function handleTurn(turn: TranscriptTurn): void {
      session.transcript.push(turn);
      send(socket, { type: 'TRANSCRIPT_TURN', turn });
      if (turn.speaker === 'candidate') {
        runAgentsForTurn(turn);
      }
    }

    function runAgentsForTurn(turn: TranscriptTurn): void {
      const startedAt = Date.now();

      // Best-guess question the candidate is responding to: the text of the
      // most recently "Mark asked"-flagged suggestion. If the recruiter went
      // off-script, this is null and the evaluator falls back to judging the
      // answer on its own merits.
      const askedTexts = session.askedQuestionIds
        .map((id) => session.suggestedQuestions.find((q) => q.id === id)?.text)
        .filter((t): t is string => typeof t === 'string');
      const questionAsked = askedTexts[askedTexts.length - 1] ?? null;

      const allButCurrent = session.transcript.slice(0, -1);
      const precedingContext = allButCurrent.slice(-4);
      const recentTranscript = session.transcript.slice(-6);

      const evalPromise = evaluateAnswer(
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
          send(socket, { type: 'EVALUATION', evaluation });
        },
      );

      const followupPromise = generateFollowupQuestions(
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
          // Update session state by id; new ids prepended.
          for (const q of questions) {
            const idx = session.suggestedQuestions.findIndex((sq) => sq.id === q.id);
            if (idx >= 0) session.suggestedQuestions[idx] = q;
            else session.suggestedQuestions.unshift(q);
          }
          send(socket, { type: 'QUESTIONS_GENERATED', questions, replace: false });
        },
      );

      Promise.all([evalPromise, followupPromise])
        .then(([evaluation, followups]) => {
          req.log.info(
            {
              sessionId: session.id,
              turnId: turn.id,
              ms: Date.now() - startedAt,
              rating: evaluation?.rating ?? null,
              followupCount: followups.length,
            },
            'Agents complete for candidate turn',
          );
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          req.log.error(
            { sessionId: session.id, turnId: turn.id, err: message },
            'Agent execution failed',
          );
          send(socket, { type: 'ERROR', message: `Agent: ${message}` });
        });
    }

    function startDeepgram(): void {
      if (candidateDg) return;
      candidateDg = openDeepgramSession({
        speaker: 'candidate',
        onTurn: handleTurn,
        onError: (err: Error) => {
          send(socket, { type: 'ERROR', message: `Transcription: ${err.message}` });
        },
        logger: scopedLogger(req.log, session.id),
      });
    }

    function stopDeepgram(): void {
      candidateDg?.close();
      candidateDg = null;
    }

    socket.on('message', (raw: Buffer, isBinary: boolean) => {
      if (isBinary) {
        if (!candidateDg) return;
        chunkCount += 1;
        if (chunkCount === 1 || chunkCount % 40 === 0) {
          req.log.info(
            { sessionId: session.id, n: chunkCount, bytes: raw.length },
            'audio chunk received',
          );
        }
        candidateDg.send(raw);
        return;
      }

      const text = raw.toString();
      const msg = parseClientMessage(text);
      if (!msg) {
        send(socket, { type: 'ERROR', message: 'Invalid message' });
        return;
      }

      switch (msg.type) {
        case 'START_INTERVIEW': {
          applyInterviewSetup(session, {
            jd: msg.jd,
            resume: msg.resume,
            seniority: msg.seniority,
            interviewType: msg.interviewType,
          });
          req.log.info(
            {
              sessionId: session.id,
              jdLen: msg.jd.length,
              resumeLen: msg.resume.length,
              seniority: msg.seniority,
              interviewType: msg.interviewType,
            },
            'Interview started',
          );
          startDeepgram();
          send(socket, { type: 'SESSION_STARTED', sessionId: session.id });

          // Fire-and-forget: question generation runs in parallel with the
          // interview proceeding. Each partial is streamed as a
          // QUESTIONS_GENERATED message with replace:true, so the side panel
          // overwrites its list as new partials arrive.
          const startedAt = Date.now();
          generateStartingQuestions(
            {
              jd: msg.jd,
              resume: msg.resume,
              seniority: msg.seniority,
              interviewType: msg.interviewType,
            },
            (questions) => {
              session.suggestedQuestions = questions;
              send(socket, {
                type: 'QUESTIONS_GENERATED',
                questions,
                replace: true,
              });
            },
          )
            .then((final) => {
              req.log.info(
                {
                  sessionId: session.id,
                  count: final.length,
                  ms: Date.now() - startedAt,
                },
                'Starting questions generated',
              );
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              req.log.error(
                { sessionId: session.id, err: message },
                'Question generation failed',
              );
              send(socket, {
                type: 'ERROR',
                message: `Question generation: ${message}`,
              });
            });
          return;
        }

        case 'MARK_QUESTION_ASKED': {
          if (!session.askedQuestionIds.includes(msg.questionId)) {
            session.askedQuestionIds.push(msg.questionId);
          }
          return;
        }

        case 'END_INTERVIEW': {
          stopDeepgram();
          const reportStartedAt = Date.now();
          generateReport(session)
            .then((markdown) => {
              req.log.info(
                {
                  sessionId: session.id,
                  ms: Date.now() - reportStartedAt,
                  bytes: markdown.length,
                  transcriptTurns: session.transcript.length,
                  evaluations: session.evaluations.length,
                },
                'Report generated',
              );
              send(socket, { type: 'REPORT_READY', markdown });
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              req.log.error({ sessionId: session.id, err: message }, 'Report generation failed');
              // Still send a report so the extension can come out of the
              // "generating" state — even if it's just an apology.
              const fallback = `# Interview Report — Generation Failed\n\nThe report generator errored: ${message}\n\nPaste your transcript and evaluations into a fresh prompt manually if you need the writeup.`;
              send(socket, { type: 'REPORT_READY', markdown: fallback });
              send(socket, { type: 'ERROR', message: `Report: ${message}` });
            });
          return;
        }

        case 'PING': {
          send(socket, { type: 'PONG' });
          return;
        }

        default: {
          send(socket, { type: 'ERROR', message: 'Unknown message type' });
        }
      }
    });

    socket.on('close', (code: number, reason: Buffer) => {
      req.log.info(
        { sessionId: session.id, code, reason: reason.toString(), chunkCount },
        'WS client disconnected',
      );
      stopDeepgram();
      deleteSession(session.id);
    });

    socket.on('error', (err: Error) => {
      req.log.error({ sessionId: session.id, err }, 'WS error');
    });
  });
}

function scopedLogger(log: FastifyBaseLogger, sessionId: string) {
  return {
    info: (obj: unknown, msg?: string) =>
      log.info({ sessionId, ...(obj as object) }, msg),
    warn: (obj: unknown, msg?: string) =>
      log.warn({ sessionId, ...(obj as object) }, msg),
    error: (obj: unknown, msg?: string) =>
      log.error({ sessionId, ...(obj as object) }, msg),
  };
}
