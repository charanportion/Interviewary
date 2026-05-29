// Catalog of the LLM providers the BYO-key setup screen offers. Each provider
// lists a curated set of model presets plus sensible defaults for the two roles
// the app uses: a `fast` model (live suggestions + evaluation, must keep the ~2s
// latency budget) and a `report` model (one-shot end-of-call writeup, quality
// over latency). The user can always override either with a custom model id.
//
// Model ids are presets — keep them here so they're trivial to bump as providers
// ship new models.

import type { LlmProvider } from '@interview-copilot/shared';

export interface ProviderInfo {
  id: LlmProvider;
  label: string;
  // Where the user gets a key — shown as a hint under the key field.
  keyHint: string;
  // Curated model ids, fastest → most capable. Shown in the model dropdowns.
  models: string[];
  defaultFastModel: string;
  defaultReportModel: string;
}

export const PROVIDERS: Record<LlmProvider, ProviderInfo> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyHint: 'console.anthropic.com → API keys (starts with "sk-ant-")',
    models: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-6'],
    defaultFastModel: 'claude-haiku-4-5',
    defaultReportModel: 'claude-sonnet-4-6',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (GPT)',
    keyHint: 'platform.openai.com → API keys (starts with "sk-")',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini'],
    defaultFastModel: 'gpt-4o-mini',
    defaultReportModel: 'gpt-4o',
  },
  google: {
    id: 'google',
    label: 'Google (Gemini)',
    keyHint: 'aistudio.google.com → Get API key',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    defaultFastModel: 'gemini-2.0-flash',
    defaultReportModel: 'gemini-2.5-pro',
  },
  xai: {
    id: 'xai',
    label: 'xAI (Grok)',
    keyHint: 'console.x.ai → API keys',
    models: ['grok-3-mini', 'grok-3', 'grok-4'],
    defaultFastModel: 'grok-3-mini',
    defaultReportModel: 'grok-3',
  },
};

export const PROVIDER_LIST: ProviderInfo[] = Object.values(PROVIDERS);

// Sentinel value used by the model <select> to switch to a free-text custom id.
export const CUSTOM_MODEL = '__custom__';
