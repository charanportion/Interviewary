import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { ratingMeta } from '../ratings';
import type { AnswerEvaluation, TranscriptTurn } from '@interview-copilot/shared';

export function TranscriptPanel() {
  const transcript = useStore((s) => s.transcript);
  const evaluations = useStore((s) => s.evaluations);
  const pendingEvalTurnId = useStore((s) => s.pendingEvalTurnId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length, evaluations.length]);

  if (transcript.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
        The transcript appears here as the candidate speaks.
      </div>
    );
  }

  const evalByTurn = new Map(evaluations.map((e) => [e.candidateTurnId, e]));

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-3 py-3">
      <ul className="flex flex-col gap-2.5">
        {transcript.map((turn) => (
          <TurnRow
            key={turn.id}
            turn={turn}
            evaluation={evalByTurn.get(turn.id)}
            pending={turn.id === pendingEvalTurnId}
          />
        ))}
      </ul>
    </div>
  );
}

function TurnRow({
  turn,
  evaluation,
  pending,
}: {
  turn: TranscriptTurn;
  evaluation: AnswerEvaluation | undefined;
  pending: boolean;
}) {
  const isInterviewer = turn.speaker === 'interviewer';

  if (isInterviewer) {
    return (
      <li className="animate-rise rounded-lg border border-line bg-paper-sunk/50 px-3 py-2">
        <Meta speaker="Interviewer" startMs={turn.startMs} />
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
          {turn.text}
        </p>
      </li>
    );
  }

  return (
    <li className="animate-rise card overflow-hidden">
      <div className="border-l-2 border-ink/15 px-3 py-2.5">
        <Meta speaker="Candidate" startMs={turn.startMs} />
        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
          {turn.text}
        </p>
      </div>
      {evaluation ? (
        <EvalFooter evaluation={evaluation} />
      ) : pending ? (
        <div className="flex items-center gap-2 border-t border-line bg-paper-sunk/40 px-3 py-2 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 animate-rec rounded-full bg-faint" />
          Evaluating answer…
        </div>
      ) : null}
    </li>
  );
}

function EvalFooter({ evaluation }: { evaluation: AnswerEvaluation }) {
  const meta = ratingMeta(evaluation.rating);
  return (
    <div className={`border-t border-line px-3 py-2 ${meta.bg}`}>
      <div className="flex items-center gap-2">
        <StrengthMeter level={meta.level} dotClass={meta.dot} />
        <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.text}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{evaluation.evidence}</p>
      {evaluation.topics.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {evaluation.topics.map((t, i) => (
            <span key={i} className="chip bg-surface/70 text-muted">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StrengthMeter({ level, dotClass }: { level: number; dotClass: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-3 rounded-full ${n <= level ? dotClass : 'bg-line-strong'}`}
        />
      ))}
    </span>
  );
}

function Meta({ speaker, startMs }: { speaker: string; startMs: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="label-eyebrow">{speaker}</span>
      <span className="font-mono text-[10px] tabular-nums text-faint">{formatTime(startMs)}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
