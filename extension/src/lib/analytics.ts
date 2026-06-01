// Opt-in, anonymous usage analytics. Fires ONLY when the user has ticked the
// consent box in Settings AND an analytics endpoint is configured. Never sends
// transcripts, answers, evidence, keys, JD/résumé, or any candidate data — only
// coarse event names and counts, tied to a random per-install client id.
//
// Posts to the landing site's Next.js API route (/api/events), which writes to
// the database server-side. No database keys live in the extension. All failures
// are swallowed — analytics must never break an interview.

import type { AppSettings } from '@interview-copilot/shared';

// Default to the production endpoint; overridable at build time via env.
// TODO: replace the default with the deployed URL once known.
const DEFAULT_ENDPOINT = '';
const ENDPOINT = (import.meta.env.VITE_ANALYTICS_ENDPOINT || DEFAULT_ENDPOINT).trim();

const CLIENT_ID_KEY = 'analyticsClientId';
let clientIdCache: string | null = null;

/** Random, anonymous per-install id. Created once and cached in storage. */
async function getClientId(): Promise<string> {
  if (clientIdCache) return clientIdCache;
  try {
    const got = (await chrome.storage.local.get(CLIENT_ID_KEY)) as {
      analyticsClientId?: string;
    };
    if (got.analyticsClientId) {
      clientIdCache = got.analyticsClientId;
      return clientIdCache;
    }
  } catch {
    /* fall through to create one */
  }
  const id = crypto.randomUUID();
  clientIdCache = id;
  try {
    await chrome.storage.local.set({ [CLIENT_ID_KEY]: id });
  } catch {
    /* in-memory only is fine */
  }
  return id;
}

export interface TrackOptions {
  event: string;
  settings: AppSettings | null | undefined;
  sessionId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Records a usage event. No-ops unless the user consented and an endpoint is
 * configured. Fire-and-forget; never throws.
 */
export async function track({ event, settings, sessionId, properties }: TrackOptions): Promise<void> {
  if (!ENDPOINT) {
    console.warn(
      `[analytics] skip "${event}": no endpoint baked into this build ` +
        '(VITE_ANALYTICS_ENDPOINT was empty when the extension was built).',
    );
    return;
  }
  if (!settings?.analyticsConsent) {
    console.info(`[analytics] skip "${event}": consent is off (enable it in Settings).`);
    return;
  }

  try {
    const clientId = await getClientId();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        event,
        session_id: sessionId ?? null,
        properties: properties ?? {},
      }),
      keepalive: true,
    });
    if (res.ok) {
      console.debug(`[analytics] sent "${event}" → ${ENDPOINT}`);
    } else {
      console.warn(`[analytics] "${event}" → ${res.status} ${res.statusText} from ${ENDPOINT}`);
    }
  } catch (err) {
    console.warn(`[analytics] send failed for "${event}" (ignored):`, err);
  }
}
