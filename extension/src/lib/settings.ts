// BYO-key settings persistence. Keys live in chrome.storage.local (this machine
// only — never synced to Google). This is a single-user prototype; keys are
// stored in plaintext, which is acceptable on the user's own device. We surface
// that fact in the settings UI.

import type { AppSettings, LlmProvider } from '@interview-copilot/shared';
import { PROVIDERS } from './providers';
import { billingConfigured } from './billing';

const STORAGE_KEY = 'settings';

const DEFAULT_PROVIDER: LlmProvider = 'anthropic';

export function emptySettings(): AppSettings {
  const p = PROVIDERS[DEFAULT_PROVIDER];
  return {
    // Default to credits in paid builds (works on first run for both editions);
    // pure-BYOK (no billing server) builds default to the user's own keys.
    accountMode: billingConfigured() ? 'server' : 'byok',
    licenseKey: '',
    deepgramKey: '',
    provider: DEFAULT_PROVIDER,
    llmKey: '',
    fastModel: p.defaultFastModel,
    reportModel: p.defaultReportModel,
    analyticsConsent: false,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = (await chrome.storage.local.get(STORAGE_KEY)) as {
      settings?: Partial<AppSettings>;
    };
    return { ...emptySettings(), ...(stored.settings ?? {}) };
  } catch {
    return emptySettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

// Minimum bar to let the user start an interview: a Deepgram key, an LLM key,
// and both model ids filled in.
export function hasValidSettings(s: AppSettings | undefined | null): s is AppSettings {
  return (
    !!s &&
    s.deepgramKey.trim().length > 0 &&
    s.llmKey.trim().length > 0 &&
    s.fastModel.trim().length > 0 &&
    s.reportModel.trim().length > 0
  );
}
