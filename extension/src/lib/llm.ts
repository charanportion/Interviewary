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

// Server-mode context, obtained from POST /v1/session/start. When present (and
// settings.accountMode === 'server') the agents talk to our metered LLM proxy
// instead of the provider directly. Server mode runs on Anthropic: we point the
// AI SDK's Anthropic provider at our proxy with the session token as the apiKey
// (sent as x-api-key; the proxy swaps in our real Anthropic key) and tag the
// request with the session id.
export interface ServerModeContext {
  serverUrl: string;
  sessionToken: string;
  sessionId: string;
  fastModel: string;
  reportModel: string;
}

export function getModel(
  settings: AppSettings,
  role: ModelRole,
  server?: ServerModeContext,
): LanguageModel {
  if (settings.accountMode === 'server' && server) {
    const modelId = role === 'fast' ? server.fastModel : server.reportModel;
    return createAnthropic({
      baseURL: `${server.serverUrl}/v1/llm`,
      apiKey: server.sessionToken,
      headers: {
        'x-session-id': server.sessionId,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    })(modelId);
  }

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
