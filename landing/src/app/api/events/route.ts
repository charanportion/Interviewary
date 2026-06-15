import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { allow } from '@/lib/ratelimit';

// Opt-in anonymous usage analytics from the extension. Called cross-origin from
// chrome-extension://, so we return permissive CORS and handle the preflight.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  if (!allow('events', request, 30, 60_000)) {
    return NextResponse.json({ status: 'error', message: 'Too many requests' }, { status: 429, headers: CORS });
  }

  let body: {
    client_id?: string;
    event?: string;
    session_id?: string | null;
    properties?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const clientId = (body.client_id ?? '').trim().slice(0, 128);
  const event = (body.event ?? '').trim().slice(0, 128);
  if (!clientId || !event) {
    return NextResponse.json(
      { status: 'error', message: 'client_id and event are required' },
      { status: 400, headers: CORS },
    );
  }

  // Cap the free-form properties blob so it can't be used to exhaust storage.
  let properties: Record<string, unknown> = {};
  if (body.properties && typeof body.properties === 'object') {
    const json = JSON.stringify(body.properties);
    if (json.length <= 2048) properties = body.properties;
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.slice(0, 128) : null;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ status: 'skipped' }, { headers: CORS });
  }

  const { error } = await supabase.from('events').insert({
    client_id: clientId,
    event,
    session_id: sessionId,
    properties,
  });

  if (error) {
    console.warn('[api/events] insert failed:', error.message);
    return NextResponse.json({ status: 'error' }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ status: 'ok' }, { headers: CORS });
}
