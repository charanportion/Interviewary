import { useState } from 'react';
import { useStore } from '../store';
import { send } from '../../lib/ws';

export function SuggestionsPanel() {
  const questions = useStore((s) => s.suggestedQuestions);
  const newQuestionIds = useStore((s) => s.newQuestionIds);
  const markAsked = useStore((s) => s.markAsked);
  const phase = useStore((s) => s.phase);

  if (questions.length === 0) {
    // We're past Setup but no starting questions have streamed in yet — show
    // a loading state. The Question Generator agent typically takes 1-3s.
    if (phase === 'interview') {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-neutral-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-indigo-500" />
          <p>Generating opening questions…</p>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-500">
        Suggested questions will appear here.
      </div>
    );
  }

  function handleMarkAsked(id: string) {
    markAsked(id);
    send({ type: 'MARK_QUESTION_ASKED', questionId: id });
  }

  const newSet = new Set(newQuestionIds);

  return (
    <div className="h-full overflow-y-auto p-3">
      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <QuestionRow
            key={q.id}
            q={q}
            isNew={newSet.has(q.id)}
            onMarkAsked={() => handleMarkAsked(q.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface QuestionRowProps {
  q: {
    id: string;
    text: string;
    topic: string;
    rationale: string;
    asked: boolean;
  };
  isNew: boolean;
  onMarkAsked: () => void;
}

function QuestionRow({ q, isNew, onMarkAsked }: QuestionRowProps) {
  const [showRationale, setShowRationale] = useState(false);

  return (
    <li
      className={`rounded-md border bg-white p-3 text-sm shadow-sm transition ${
        q.asked
          ? 'border-neutral-200 opacity-50'
          : isNew
            ? 'border-indigo-400 ring-2 ring-indigo-200'
            : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-1">
            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
              {q.topic}
            </span>
            {isNew && !q.asked && (
              <span className="inline-block rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          <p className="font-medium text-neutral-900">{q.text}</p>
        </div>
        <button
          type="button"
          onClick={onMarkAsked}
          disabled={q.asked}
          className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {q.asked ? 'Asked' : 'Mark asked'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setShowRationale((v) => !v)}
        className="mt-1 text-xs text-indigo-600 hover:underline"
      >
        {showRationale ? 'Hide rationale' : 'Why ask this?'}
      </button>
      {showRationale && (
        <p className="mt-1 text-xs text-neutral-600">{q.rationale}</p>
      )}
    </li>
  );
}
