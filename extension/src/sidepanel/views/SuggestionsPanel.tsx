import { useState } from 'react';
import { useStore } from '../store';
import { markQuestionAsked } from '../../lib/engine';
import type { SuggestedQuestion } from '@interview-copilot/shared';

export function SuggestionsPanel() {
  const questions = useStore((s) => s.suggestedQuestions);
  const newQuestionIds = useStore((s) => s.newQuestionIds);
  const markAsked = useStore((s) => s.markAsked);
  const phase = useStore((s) => s.phase);
  const [hideAsked, setHideAsked] = useState(false);

  if (questions.length === 0) {
    if (phase === 'interview') {
      return (
        <Empty>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
          <p>Generating opening questions…</p>
        </Empty>
      );
    }
    return <Empty>Suggested questions will appear here.</Empty>;
  }

  function handleMarkAsked(id: string) {
    markAsked(id);
    markQuestionAsked(id);
  }

  const newSet = new Set(newQuestionIds);
  const askedCount = questions.filter((q) => q.asked).length;
  const visible = hideAsked ? questions.filter((q) => !q.asked) : questions;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <span className="label-eyebrow">Ask next</span>
        {askedCount > 0 && (
          <button
            type="button"
            onClick={() => setHideAsked((v) => !v)}
            className="text-[11px] font-semibold text-muted transition hover:text-ink"
          >
            {hideAsked ? `Show asked (${askedCount})` : 'Hide asked'}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-2.5">
          {visible.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              isNew={newSet.has(q.id)}
              onMarkAsked={() => handleMarkAsked(q.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

interface QuestionRowProps {
  q: SuggestedQuestion;
  isNew: boolean;
  onMarkAsked: () => void;
}

function QuestionRow({ q, isNew, onMarkAsked }: QuestionRowProps) {
  const [showRationale, setShowRationale] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(q.text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => {},
    );
  }

  return (
    <li
      className={`card overflow-hidden transition ${
        q.asked
          ? 'opacity-55'
          : isNew
            ? 'animate-flash animate-rise border-accent'
            : ''
      }`}
    >
      <div className="p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="chip chip-topic">{q.topic}</span>
          {isNew && !q.asked && (
            <span className="chip bg-accent-soft font-semibold text-accent">New</span>
          )}
          {q.asked && (
            <span className="chip chip-topic ml-auto gap-1 text-strong">
              <CheckIcon /> Asked
            </span>
          )}
        </div>

        <p className="text-[15px] font-medium leading-snug text-ink">{q.text}</p>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAsked}
            disabled={q.asked}
            className={`btn btn-sm ${q.asked ? 'btn-secondary' : 'btn-primary'}`}
          >
            {q.asked ? 'Asked' : 'Mark asked'}
          </button>
          <button
            type="button"
            onClick={() => setShowRationale((v) => !v)}
            className="btn btn-secondary btn-sm"
            aria-expanded={showRationale}
          >
            {showRationale ? 'Hide' : 'What to listen for'}
          </button>
          <button
            type="button"
            onClick={copy}
            title="Copy question"
            aria-label="Copy question"
            className="ml-auto rounded-md p-1.5 text-muted transition hover:bg-paper-sunk hover:text-ink"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {showRationale && (
        <div className="animate-rise border-t border-line bg-paper-sunk/60 px-3 py-2.5">
          <span className="label-eyebrow">What a strong answer sounds like</span>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{q.rationale}</p>
        </div>
      )}
    </li>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="7" y="7" width="9" height="9" rx="1.6" />
      <path d="M4 13V5a1 1 0 0 1 1-1h8" strokeLinecap="round" />
    </svg>
  );
}
