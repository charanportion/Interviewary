// Provider-agnostic model factory. The agents (questionGenerator, answerEvaluator,
// report) take a Vercel AI SDK `LanguageModel` and don't care which provider
// produced it — so the whole app is provider-agnostic and only this file knows
// about the four providers.
//
// CORS note: these calls run from the extension's side-panel page, which has
// cross-origin privileges for the hosts declared in manifest host_permissions,
// so the browser does not enforce CORS. Anthropic additionally needs the
// `anthropic-dangerous-direct-browser-access` header to allow browser use.

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import type { LanguageModel } from 'ai';
import type { AppSettings } from '@interview-copilot/shared';

export type ModelRole = 'fast' | 'report';

export function getModel(settings: AppSettings, role: ModelRole): LanguageModel {
  const modelId = role === 'fast' ? settings.fastModel : settings.reportModel;
  const apiKey = settings.llmKey;

  switch (settings.provider) {
    case 'anthropic':
      return createAnthropic({
        apiKey,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      })(modelId);
    case 'openai':
      return createOpenAI({ apiKey })(modelId);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case 'xai':
      return createXai({ apiKey })(modelId);
  }
}
