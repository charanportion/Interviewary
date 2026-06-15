import { useEffect } from 'react';
import { useStore } from './store';
import { loadSettings } from '../lib/settings';
import { SetupView } from './views/SetupView';
import { InterviewView } from './views/InterviewView';
import { SettingsView } from './views/SettingsView';
import { ReportView } from './views/ReportView';
import { PaywallView } from './views/PaywallView';

export function App() {
  const phase = useStore((s) => s.phase);
  const applyLoadedSettings = useStore((s) => s.applyLoadedSettings);
  const refreshEntitlement = useStore((s) => s.refreshEntitlement);
  const openSettings = useStore((s) => s.openSettings);

  useEffect(() => {
    loadSettings()
      .then(applyLoadedSettings)
      .then(() => refreshEntitlement());
  }, [applyLoadedSettings, refreshEntitlement]);

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <TopBar onSettings={openSettings} showSettings={phase !== 'settings'} />
      <main className="flex-1 overflow-hidden">
        {phase === 'settings' ? (
          <SettingsView />
        ) : phase === 'paywall' ? (
          <PaywallView />
        ) : phase === 'report' ? (
          <ReportView />
        ) : phase === 'interview' ? (
          <InterviewView />
        ) : (
          <SetupView />
        )}
      </main>
    </div>
  );
}

function TopBar({
  onSettings,
  showSettings,
}: {
  onSettings: () => void;
  showSettings: boolean;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <Logo />
        <span className="wordmark text-[17px] leading-none text-ink">Interviewary</span>
      </div>
      {showSettings && (
        <button
          type="button"
          onClick={onSettings}
          className="-mr-1 rounded-lg p-1.5 text-muted transition hover:bg-paper-sunk hover:text-ink"
          title="Settings"
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      )}
    </header>
  );
}

function Logo() {
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-md text-paper shadow-[var(--shadow-soft)]"
      style={{ backgroundColor: 'var(--color-ink)' }}
      aria-hidden
    >
      <span className="display text-[15px] font-semibold leading-none">I</span>
    </span>
  );
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
