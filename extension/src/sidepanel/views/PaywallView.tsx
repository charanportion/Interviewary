import { useStore } from '../store';
import { PRICING_URL } from '../../lib/plans';

// Hard paywall: shown when there's no active entitlement. Since the extension is
// downloaded only after purchase, the common case is "I bought it — let me in",
// so activating a license key is the primary action. Viewing plans is the
// secondary path for anyone who landed here without an active plan.
export function PaywallView() {
  const openSettings = useStore((s) => s.openSettings);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="display text-xl font-semibold text-ink">Activate Interviewary</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Enter the license key from your purchase to unlock the extension. Subscriptions run on
          our keys (credits); lifetime adds your own keys.
        </p>
      </div>

      <button
        type="button"
        onClick={openSettings}
        className="btn btn-primary btn-md w-full"
      >
        Enter your license key →
      </button>

      <div className="rounded-xl border border-line bg-paper-sunk p-3 text-[11px] leading-relaxed text-muted">
        Your key was emailed to you after checkout (and is on your Polar receipt). It looks like
        <span className="font-semibold text-ink"> IVWY-XXXX-XXXX-XXXX</span>.
      </div>

      <button
        type="button"
        onClick={() => chrome.tabs.create({ url: PRICING_URL })}
        className="mt-auto text-center text-xs font-semibold text-accent hover:underline"
      >
        Don’t have a plan yet? View pricing →
      </button>
    </div>
  );
}
