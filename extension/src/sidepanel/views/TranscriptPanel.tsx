import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function TranscriptPanel() {
  const transcript = useStore((s) => s.transcript);
  const evaluations = useStore((s) => s.evaluations);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length]);

  if (transcript.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-500">
        Transcript will appear here once the interview starts.
      </div>
    );
  }

  const evalByTurn = new Map(evaluations.map((e) => [e.candidateTurnId, e]));

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-3">
      <ul className="flex flex-col gap-2">
        {transcript.map((turn) => {
          const isInterviewer = turn.speaker === 'interviewer';
          const evaluation = evalByTurn.get(turn.id);
          return (
            <li
              key={turn.id}
              className={`rounded-md px-3 py-2 text-sm shadow-sm ${
                isInterviewer
                  ? 'bg-sky-50 text-sky-900'
                  : 'bg-violet-50 text-violet-900'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {isInterviewer ? 'Interviewer' : 'Candidate'}
              </div>
              <div className="whitespace-pre-wrap">{turn.text}</div>
              {evaluation ? (
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-white/60 px-1.5 py-0.5 text-[11px] font-medium">
                  <span className={`uppercase ${ratingColor(evaluation.rating)}`}>
                    {evaluation.rating}
                  </span>
                  <span className="text-neutral-600">· {evaluation.evidence}</span>
                </div>
              ) : !isInterviewer ? (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded bg-white/60 px-1.5 py-0.5 text-[11px] text-neutral-500">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
                  Evaluating…
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ratingColor(rating: string): string {
  switch (rating) {
    case 'weak':
      return 'text-rose-600';
    case 'adequate':
      return 'text-amber-600';
    case 'strong':
      return 'text-emerald-600';
    case 'exceptional':
      return 'text-indigo-600';
    default:
      return 'text-neutral-600';
  }
}
