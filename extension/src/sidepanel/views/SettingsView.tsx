import { useState } from 'react';
import { useStore, byokAvailable } from '../store';
import { PROVIDERS, PROVIDER_LIST, CUSTOM_MODEL } from '../../lib/providers';
import { saveSettings, hasValidSettings } from '../../lib/settings';
import { validateKeys, type KeyCheckResult } from '../../lib/validateKeys';
import {
  billingConfigured,
  resolveLicense,
  createCheckout,
  cancelSubscription,
} from '../../lib/billing';
import { TOPUP_PLANS, detectCurrency } from '../../lib/plans';
import type { AppSettings, Entitlement, LlmProvider, ProductKind } from '@interview-copilot/shared';

export function SettingsView() {
  const stored = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const closeSettings = useStore((s) => s.closeSettings);
  const entitlement = useStore((s) => s.entitlement);
  const setEntitlement = useStore((s) => s.setEntitlement);

  const [draft, setDraft] = useState<AppSettings>(stored);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<KeyCheckResult | null>(null);
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkBusy, setLinkBusy] = useState<ProductKind | 'cancel' | null>(null);

  const billing = billingConfigured();
  const currency = detectCurrency();
  const provider = PROVIDERS[draft.provider];
  const byokComplete = hasValidSettings(draft);
  const entitled = !!entitlement && entitlement.status !== 'none';
  // BYOK only for the lifetime build + a lifetime entitlement. Subscription is
  // credits-only, so we hide the keys UI and the mode toggle entirely.
  const byok = byokAvailable(entitlement);
  // The key fields (Deepgram + LLM) only make sense in your-own-keys mode. In
  // credits/server mode we run on our keys, so hide them entirely.
  const showKeys = byok && draft.accountMode === 'byok';

  // Save rules: with billing on, an active entitlement is required (hard paywall);
  // BYOK keys are only required when BYOK is available AND the user picked it.
  const canSave = billing
    ? entitled && (byok && draft.accountMode === 'byok' ? byokComplete : true)
    : byokComplete;
  const canCancel = billing ? entitled : hasValidSettings(stored);

  function update(patch: Partial<AppSettings>) {
    setResult(null);
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function handleActivate() {
    setActivating(true);
    setActivateMsg(null);
    try {
      await saveSettings(draft); // persist the license key before resolving
      setSettings(draft);
      const r = await resolveLicense(draft.licenseKey.trim());
      if (r.ok) {
        setEntitlement(r.entitlement);
        setActivateMsg({
          ok: true,
          text: `Activated: ${r.entitlement.status} · ${r.entitlement.creditsRemaining} credits`,
        });
      } else {
        const none: Entitlement = { status: 'none', creditsRemaining: 0 };
        setEntitlement(none);
        setActivateMsg({ ok: false, text: r.error ?? 'License key is not valid.' });
      }
    } catch (err) {
      setActivateMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setActivating(false);
    }
  }

  async function buyTopup(kind: ProductKind) {
    setLinkBusy(kind);
    try {
      const url = await createCheckout(kind);
      chrome.tabs.create({ url });
    } catch (err) {
      setActivateMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLinkBusy(null);
    }
  }

  async function handleCancelSubscription() {
    const ok = window.confirm(
      'Cancel your subscription? You keep access and remaining credits until the end of the current billing period.',
    );
    if (!ok) return;
    setLinkBusy('cancel');
    try {
      const r = await cancelSubscription();
      setActivateMsg(
        r.ok
          ? { ok: true, text: 'Subscription will cancel at the end of the current period.' }
          : { ok: false, text: r.error ?? 'Could not cancel the subscription.' },
      );
    } catch (err) {
      setActivateMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLinkBusy(null);
    }
  }

  function onProviderChange(p: LlmProvider) {
    // Switching provider resets the models to that provider's defaults, since
    // model ids aren't portable across providers.
    const info = PROVIDERS[p];
    update({
      provider: p,
      fastModel: info.defaultFastModel,
      reportModel: info.defaultReportModel,
    });
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      setResult(await validateKeys(draft));
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    // Never persist BYOK mode when BYOK isn't available (subscription / sub build).
    const toSave: AppSettings = byok ? draft : { ...draft, accountMode: 'server' };
    await saveSettings(toSave);
    setSettings(toSave);
    closeSettings();
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="display text-xl font-semibold text-ink">Settings</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {billing
            ? 'Activate your license, then choose to run on credits (our keys) or your own keys. Keys are stored on this device only (chrome.storage.local) in plaintext.'
            : 'You bring your own keys. Everything runs locally in this side panel — there is no server. Keys are stored on this device only (chrome.storage.local) in plaintext.'}
        </p>
      </div>

      {billing && (
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-paper-sunk p-3">
          <div className="flex items-center justify-between">
            <span className="label-eyebrow">Account</span>
            <PlanBadge entitlement={entitlement} />
          </div>

          <Field label="License key" hint="From your purchase email / Polar receipt.">
            <input
              type="text"
              value={draft.licenseKey}
              onChange={(e) => update({ licenseKey: e.target.value })}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className={inputCls}
              autoComplete="off"
            />
          </Field>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating || !draft.licenseKey.trim()}
            className="btn btn-secondary btn-sm w-full"
          >
            {activating ? 'Activating…' : 'Activate license'}
          </button>

          {activateMsg && (
            <p
              className={`rounded-lg p-2.5 text-xs leading-relaxed ${
                activateMsg.ok ? 'bg-strong-bg text-strong' : 'bg-weak-bg text-weak'
              }`}
            >
              {activateMsg.text}
            </p>
          )}

          {entitled && (
            <>
              {byok && (
                <div className="flex flex-col gap-1.5">
                  <span className="label-eyebrow">Run interviews using</span>
                  <ModeToggle
                    value={draft.accountMode}
                    credits={entitlement?.creditsRemaining ?? 0}
                    onChange={(m) => update({ accountMode: m })}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <span className="label-eyebrow">Buy credits (top-up)</span>
                <div className="grid grid-cols-3 gap-2">
                  {TOPUP_PLANS.map((t) => (
                    <button
                      key={t.kind}
                      type="button"
                      onClick={() => buyTopup(t.kind)}
                      disabled={linkBusy !== null}
                      className="btn btn-secondary btn-sm flex-col py-1.5! leading-tight"
                      title={`${t.price[currency]} · ${t.credits} credits`}
                    >
                      {linkBusy === t.kind ? (
                        '…'
                      ) : (
                        <>
                          <span className="text-xs font-semibold">{t.credits.toLocaleString()}</span>
                          <span className="text-[10px] text-faint">{t.price[currency]}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {entitlement?.status === 'subscription' && (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={linkBusy !== null}
                  className="btn btn-secondary btn-sm w-full"
                >
                  {linkBusy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {billing && byok && (
        <p className="text-[11px] leading-relaxed text-faint">
          {draft.accountMode === 'server'
            ? 'Credits mode runs on our keys — switch to your-own-keys mode to enter your own.'
            : 'Your-own-keys mode — fill these in to run interviews without spending credits.'}
        </p>
      )}

      {/* BYOK credentials — only in your-own-keys mode (lifetime build + lifetime
          entitlement). In credits/server mode and on subscriptions these are hidden. */}
      {showKeys && (
        <>
          <Field label="Deepgram API key" hint="console.deepgram.com → API keys">
            <input
              type="password"
              value={draft.deepgramKey}
              onChange={(e) => update({ deepgramKey: e.target.value })}
              placeholder="Deepgram key"
              className={inputCls}
              autoComplete="off"
            />
          </Field>

          <Field label="LLM provider">
            <select
              value={draft.provider}
              onChange={(e) => onProviderChange(e.target.value as LlmProvider)}
              className={inputCls}
            >
              {PROVIDER_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${provider.label} API key`} hint={provider.keyHint}>
            <input
              type="password"
              value={draft.llmKey}
              onChange={(e) => update({ llmKey: e.target.value })}
              placeholder="API key"
              className={inputCls}
              autoComplete="off"
            />
          </Field>

          <ModelPicker
            label="Fast model (live suggestions + evaluation)"
            hint="Keep this light — it runs after every answer and must stay under the ~2s latency budget."
            value={draft.fastModel}
            options={provider.models}
            onChange={(v) => update({ fastModel: v })}
          />

          <ModelPicker
            label="Report model (end-of-call writeup)"
            hint="Runs once at the end. Favor quality over speed."
            value={draft.reportModel}
            options={provider.models}
            onChange={(v) => update({ reportModel: v })}
          />
        </>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-paper-sunk p-3">
        <input
          type="checkbox"
          checked={draft.analyticsConsent ?? false}
          onChange={(e) => update({ analyticsConsent: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <span className="text-[11px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Share anonymous usage analytics</span> — helps
          improve Interviewary. Sends only event counts (interview started/ended, answer ratings),
          never transcripts, answers, keys, or candidate data. Off by default; change anytime.
        </span>
      </label>

      {showKeys && result && (
        <div className="flex flex-col gap-1 text-xs">
          <CheckRow label="Deepgram" ok={result.deepgram.ok} message={result.deepgram.message} />
          <CheckRow label="LLM" ok={result.llm.ok} message={result.llm.message} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {showKeys && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !draft.deepgramKey || !draft.llmKey}
            className="btn btn-secondary btn-md w-full"
          >
            {testing ? 'Testing…' : 'Test keys'}
          </button>
        )}
        <div className="flex gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={closeSettings}
              className="btn btn-secondary btn-md flex-1"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="btn btn-primary btn-md flex-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'field-input';

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-eyebrow">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-relaxed text-faint">{hint}</span>}
    </label>
  );
}

interface ModelPickerProps {
  label: string;
  hint?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function ModelPicker({ label, hint, value, options, onChange }: ModelPickerProps) {
  const [custom, setCustom] = useState(() => !options.includes(value));

  // If the parent switched providers, `value` may now be a preset again — keep
  // the custom toggle in sync when it clearly matches a preset.
  const showCustom = custom || !options.includes(value);

  return (
    <Field label={label} hint={hint}>
      <select
        value={showCustom ? CUSTOM_MODEL : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_MODEL) {
            setCustom(true);
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className={inputCls}
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value={CUSTOM_MODEL}>Custom…</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a model id"
          className={`${inputCls} mt-1`}
          autoComplete="off"
        />
      )}
    </Field>
  );
}

function CheckRow({ label, ok, message }: { label: string; ok: boolean; message: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg p-2.5 leading-relaxed ${
        ok ? 'bg-strong-bg text-strong' : 'bg-weak-bg text-weak'
      }`}
    >
      <span className="font-bold">{ok ? '✓' : '✗'}</span>
      <span>
        <strong>{label}:</strong> {message}
      </span>
    </div>
  );
}

function PlanBadge({ entitlement }: { entitlement: Entitlement | null }) {
  const status = entitlement?.status ?? 'none';
  const label =
    status === 'lifetime' ? 'Lifetime' : status === 'subscription' ? 'Subscription' : 'Not activated';
  const tone = status === 'none' ? 'bg-weak-bg text-weak' : 'bg-strong-bg text-strong';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
      {status !== 'none' && ` · ${entitlement?.creditsRemaining ?? 0} cr`}
    </span>
  );
}

function ModeToggle({
  value,
  credits,
  onChange,
}: {
  value: AppSettings['accountMode'];
  credits: number;
  onChange: (m: AppSettings['accountMode']) => void;
}) {
  const opts: Array<{ id: AppSettings['accountMode']; label: string; sub: string; disabled?: boolean }> = [
    {
      id: 'server',
      label: 'Credits',
      sub: credits > 0 ? `${credits} left` : 'none left',
      disabled: credits <= 0,
    },
    { id: 'byok', label: 'My own keys', sub: 'no credits used' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={o.disabled && !active}
            onClick={() => onChange(o.id)}
            className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
              active
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-surface hover:border-muted disabled:opacity-50'
            }`}
          >
            <span className="text-xs font-semibold text-ink">{o.label}</span>
            <span className="text-[11px] text-faint">{o.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
