import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { send } from '../../lib/ws';
import { stopAudio } from '../../lib/audio';
import { TranscriptPanel } from './TranscriptPanel';
import { SuggestionsPanel } from './SuggestionsPanel';

export function InterviewView() {
  const interviewStartMs = useStore((s) => s.interviewStartMs);
  const serverErrors = useStore((s) => s.serverErrors);
  const dismissError = useStore((s) => s.dismissError);
  const reportStatus = useStore((s) => s.reportStatus);
  const setReportStatus = useStore((s) => s.setReportStatus);

  function handleEnd() {
    stopAudio();
    setReportStatus('generating');
    send({ type: 'END_INTERVIEW' });
  }

  return (
    <div className="relative flex h-full flex-col">
      {reportStatus === 'generating' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 text-center backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-neutral-700">Generating report…</p>
          <p className="text-xs text-neutral-500">The download will start automatically.</p>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
        <Elapsed startMs={interviewStartMs} />
        <button
          type="button"
          onClick={handleEnd}
          disabled={reportStatus === 'generating'}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          End interview
        </button>
      </div>

      {serverErrors.length > 0 && (
        <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {serverErrors.map((err, i) => (
            <div key={i} className="flex items-start justify-between gap-2 py-0.5">
              <span className="flex-1">{err}</span>
              <button
                type="button"
                onClick={() => dismissError(i)}
                className="shrink-0 px-1 text-rose-600 hover:text-rose-800"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden border-b border-neutral-200">
          <SuggestionsPanel />
        </div>
        <div className="flex-1 overflow-hidden">
          <TranscriptPanel />
        </div>
      </div>
    </div>
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
    <span className="font-mono text-sm text-neutral-700">
      {mm}:{ss}
    </span>
  );
}
