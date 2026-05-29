/** Shared copy + constants for the marketing site. */

/** Served from landing/public — produced by scripts/package-extension.mjs. */
export const DOWNLOAD_HREF = '/interviewary-extension.zip';

export const PRODUCT_NAME = 'Interviewary';
export const TAGLINE =
  'Live transcription + AI follow-up questions for technical interviews on Google Meet.';

export const CONTACT_EMAIL = 'sricharan.rayala@dotportion.com';

/** Shown on the legal pages; update when the documents change. */
export const LEGAL_LAST_UPDATED = 'May 29, 2026';

/** The third parties a user's own data may reach, depending on their config. */
export const SUBPROCESSORS = [
  { name: 'Deepgram', role: 'Speech-to-text transcription', href: 'https://deepgram.com/privacy' },
  { name: 'Anthropic (Claude)', role: 'LLM provider (if selected)', href: 'https://www.anthropic.com/legal/privacy' },
  { name: 'OpenAI', role: 'LLM provider (if selected)', href: 'https://openai.com/policies/privacy-policy' },
  { name: 'Google (Gemini)', role: 'LLM provider (if selected)', href: 'https://policies.google.com/privacy' },
  { name: 'xAI (Grok)', role: 'LLM provider (if selected)', href: 'https://x.ai/legal/privacy-policy' },
  { name: 'Supabase', role: 'Stores download contact details & opt-in usage analytics', href: 'https://supabase.com/privacy' },
] as const;

/** Where users get the API keys referenced in the setup guide. */
export const KEY_CONSOLES = {
  deepgram: 'https://console.deepgram.com/',
  anthropic: 'https://console.anthropic.com/',
  openai: 'https://platform.openai.com/api-keys',
  google: 'https://aistudio.google.com/app/apikey',
  xai: 'https://console.x.ai/',
} as const;
