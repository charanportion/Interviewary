import { useState } from 'react';
import { useStore } from '../store';
import { PROVIDERS, PROVIDER_LIST, CUSTOM_MODEL } from '../../lib/providers';
import { saveSettings, hasValidSettings } from '../../lib/settings';
import { validateKeys, type KeyCheckResult } from '../../lib/validateKeys';
import type { AppSettings, LlmProvider } from '@interview-copilot/shared';

export function SettingsView() {
  const stored = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const closeSettings = useStore((s) => s.closeSettings);

  const [draft, setDraft] = useState<AppSettings>(stored);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<KeyCheckResult | null>(null);

  const provider = PROVIDERS[draft.provider];
  const canSave = hasValidSettings(draft);
  const canCancel = hasValidSettings(stored);

  function update(patch: Partial<AppSettings>) {
    setResult(null);
    setDraft((d) => ({ ...d, ...patch }));
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
    await saveSettings(draft);
    setSettings(draft);
    closeSettings();
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="display text-xl font-semibold text-ink">Settings</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          You bring your own keys. Everything runs locally in this side panel —
          there is no server. Keys are stored on this device only
          (chrome.storage.local) in plaintext.
        </p>
      </div>

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

      {result && (
        <div className="flex flex-col gap-1 text-xs">
          <CheckRow label="Deepgram" ok={result.deepgram.ok} message={result.deepgram.message} />
          <CheckRow label="LLM" ok={result.llm.ok} message={result.llm.message} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !draft.deepgramKey || !draft.llmKey}
          className="btn btn-secondary btn-md w-full"
        >
          {testing ? 'Testing…' : 'Test keys'}
        </button>
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
