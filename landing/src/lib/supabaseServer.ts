import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client. Uses the service_role key, which bypasses RLS —
// it must NEVER be exposed to the browser, so this module imports `server-only`
// to make any accidental client import a build error.
const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

/** Returns the shared server client, or null when env is unset (degrade gracefully). */
export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
