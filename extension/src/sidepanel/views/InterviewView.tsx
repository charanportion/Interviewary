import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { endInterview } from '../../lib/engine';
import { stopAudio } from '../../lib/audio';
import { TranscriptPanel } from './TranscriptPanel';
import { SuggestionsPanel } from './SuggestionsPanel';

type Tab = 'questions' | 'transcript';

export function InterviewView() {
  const interviewStartMs = useStore((s) => s.interviewStartMs);
  const serverErrors = useStore((s) => s.serverErrors);
  const dismissError = useStore((s) => s.dismissError);
  const reportStatus = useStore((s) => s.reportStatus);
  const setReportStatus = useStore((s) => s.setReportStatus);
  const audioStatus = useStore((s) => s.audioStatus);

  const questionCount = useStore((s) => s.suggestedQuestions.length);
  const answerCount = useStore((s) => s.transcript.filter((t) => t.speaker === 'candidate').length);

  const [tab, setTab] = useState<Tab>('questions');

  // Show a "new activity" dot on the tab you're NOT looking at.
  const seenAnswers = useRef(answerCount);
  const seenQuestions = useRef(questionCount);
  const [answerDot, setAnswerDot] = useState(false);
  const [questionDot, setQuestionDot] = useState(false);

  useEffect(() => {
    if (tab === 'transcript') {
      seenAnswers.current = answerCount;
      setAnswerDot(false);
    } else if (answerCount > seenAnswers.current) {
      setAnswerDot(true);
    }
  }, [answerCount, tab]);

  useEffect(() => {
    if (tab === 'questions') {
      seenQuestions.current = questionCount;
      setQuestionDot(false);
    } else if (questionCount > seenQuestions.current) {
      setQuestionDot(true);
    }
  }, [questionCount, tab]);

  function handleEnd() {
    stopAudio();
    setReportStatus('generating');
    endInterview();
  }

  return (
    <div className="relative flex h-full flex-col">
      {reportStatus === 'generating' && <ReportOverlay />}

      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <RecStatus status={audioStatus} />
          <Elapsed startMs={interviewStartMs} />
        </div>
        <button
          type="button"
          onClick={handleEnd}
          disabled={reportStatus === 'generating'}
          className="btn btn-danger btn-sm"
        >
          End &amp; report
        </button>
      </div>

      {serverErrors.length > 0 && (
        <div className="shrink-0 border-b border-line bg-weak-bg">
          {serverErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 px-4 py-1.5 text-xs text-weak"
            >
              <span className="flex-1 leading-snug">{err}</span>
              <button
                type="button"
                onClick={() => dismissError(i)}
                className="shrink-0 rounded px-1 font-bold text-weak/70 hover:text-weak"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-line bg-surface px-2">
        <TabButton
          active={tab === 'questions'}
          onClick={() => setTab('questions')}
          label="Questions"
          count={questionCount}
          dot={questionDot}
        />
        <TabButton
          active={tab === 'transcript'}
          onClick={() => setTab('transcript')}
          label="Transcript"
          count={answerCount}
          dot={answerDot}
        />
      </div>

      {/* Panel — full height for the active tab */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'questions' ? <SuggestionsPanel /> : <TranscriptPanel />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-ink text-ink'
          : 'border-transparent text-muted hover:text-ink-soft'
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
            active ? 'bg-ink text-paper' : 'bg-paper-sunk text-muted'
          }`}
        >
          {count}
        </span>
      )}
      {dot && !active && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

function RecStatus({ status }: { status: string }) {
  if (status === 'capturing') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-weak">
        <span className="h-2 w-2 animate-rec rounded-full bg-weak" />
        Recording
      </span>
    );
  }
  if (status === 'starting') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="h-2 w-2 rounded-full bg-faint" />
        Starting…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
      <span className="h-2 w-2 rounded-full bg-faint" />
      {status === 'error' ? 'Audio error' : 'Idle'}
    </span>
  );
}

function Elapsed({ startMs }: { startMs: number | undefined }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = startMs ? Math.floor((now - startMs) / 1000) : 0;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');

  return (
    <span className="font-mono text-xs tabular-nums text-muted">
      {mm}:{ss}
    </span>
  );
}

function ReportOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-paper/90 text-center backdrop-blur-sm">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-ink" />
      </div>
      <div>
        <p className="display text-base font-semibold text-ink">Writing the report…</p>
        <p className="mt-1 text-xs text-muted">Your download will start automatically.</p>
      </div>
    </div>
  );
}
