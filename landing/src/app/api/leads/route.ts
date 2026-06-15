import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { allow } from '@/lib/ratelimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lead capture for the gated download. Same-origin (called from the site), so no
// CORS needed. Never returns a hard failure that would block the download — the
// client downloads regardless of the result here.
export async function POST(request: Request) {
  if (!allow('leads', request, 5, 60_000)) {
    return NextResponse.json({ status: 'error', message: 'Too many requests' }, { status: 429 });
  }

  let body: { email?: string; phone?: string; consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().slice(0, 254);
  const phone = (body.phone ?? '').trim().slice(0, 32);
  const consent = body.consent === true;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ status: 'error', message: 'Invalid email' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ status: 'error', message: 'Consent required' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    // Not configured — that's fine, the download still proceeds client-side.
    return NextResponse.json({ status: 'skipped' });
  }

  const { error } = await supabase.from('downloads').insert({
    email,
    phone: phone || null,
    consent,
    user_agent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
  });

  if (error) {
    console.warn('[api/leads] insert failed:', error.message);
    return NextResponse.json({ status: 'error', message: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
