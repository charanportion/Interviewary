export interface LeadInput {
  email: string;
  phone?: string;
  consent: boolean;
}

export type LeadResult =
  | { status: 'ok' }
  | { status: 'skipped' } // backend not configured — download still proceeds
  | { status: 'error'; message: string };

/**
 * Records a download lead via the Next API route. Never throws — the download
 * must not be blocked by a backend hiccup, so failures are returned and logged.
 */
export async function recordDownload(input: LeadInput): Promise<LeadResult> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const message = `lead request failed (${res.status})`;
      console.warn('[leads]', message);
      return { status: 'error', message };
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return data.status === 'skipped' ? { status: 'skipped' } : { status: 'ok' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[leads] request threw:', message);
    return { status: 'error', message };
  }
}
