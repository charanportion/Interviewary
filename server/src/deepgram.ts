// Server-mode Deepgram credential. We use a single standard API key (set in env)
// and hand it to the extension, which connects to Deepgram DIRECTLY — so the
// real-time transcription path never touches our server and the 2s latency
// budget is preserved. Usage is metered by interview minutes via the heartbeat.
//
// NOTE: this exposes the key to the (authenticated, paying) client. For a
// prototype that's an accepted tradeoff. To avoid it later, use an admin
// (keys:write) key to mint short-TTL scoped keys per session instead.

import { env } from './env.ts';

export interface SessionKey {
  key: string;
  ttlSec: number; // 0 = no per-session expiry (standard key)
}

export function getSessionDeepgramKey(): SessionKey {
  if (!env.deepgram.apiKey) throw new Error('DEEPGRAM_API_KEY not configured');
  return { key: env.deepgram.apiKey, ttlSec: 0 };
}
