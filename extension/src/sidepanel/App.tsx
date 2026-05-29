import { useEffect } from 'react';
import { useStore } from './store';
import { connect } from '../lib/ws';
import { SetupView } from './views/SetupView';
import { InterviewView } from './views/InterviewView';

export function App() {
  const phase = useStore((s) => s.phase);
  const wsStatus = useStore((s) => s.wsStatus);

  useEffect(() => {
    connect();
  }, []);

  return (
    <div className="flex h-full flex-col bg-neutral-50 text-neutral-900">
      <TopBar wsStatus={wsStatus} />
      <main className="flex-1 overflow-hidden">
        {phase === 'setup' ? <SetupView /> : <InterviewView />}
      </main>
    </div>
  );
}

function TopBar({ wsStatus }: { wsStatus: string }) {
  const colorMap: Record<string, string> = {
    open: 'bg-emerald-500',
    connecting: 'bg-amber-400',
    closed: 'bg-rose-500',
    disconnected: 'bg-neutral-400',
  };
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
      <h1 className="text-sm font-semibold tracking-tight">Interview Copilot</h1>
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span
          className={`inline-block h-2 w-2 rounded-full ${colorMap[wsStatus] ?? 'bg-neutral-400'}`}
          aria-hidden
        />
        <span>{wsStatus}</span>
      </div>
    </header>
  );
}
