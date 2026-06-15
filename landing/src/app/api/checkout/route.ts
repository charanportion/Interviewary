// Checkout entry point for the pricing page. Pricing buttons link here with
// ?plan=<slug>; we ask the billing server to create a Polar checkout (it owns
// the Polar token + product ids + success URL) and redirect the user to it.
//
// This keeps the marketing site free of any Polar credentials — it only needs to
// know where the billing server lives.

import { NextResponse, type NextRequest } from 'next/server';
import { ALL_PLAN_SLUGS } from '@/lib/pricing';
import { allow } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const BILLING_SERVER_URL = (process.env.BILLING_SERVER_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  if (!allow('checkout', req, 10, 60_000)) {
    return NextResponse.redirect(new URL('/pricing?error=checkout', req.url));
  }
  const plan = req.nextUrl.searchParams.get('plan');
  if (!plan || !ALL_PLAN_SLUGS.includes(plan as never)) {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  try {
    const res = await fetch(`${BILLING_SERVER_URL}/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: plan }),
    });
    if (!res.ok) throw new Error(`billing checkout ${res.status}`);
    const { url } = (await res.json()) as { url?: string };
    if (!url) throw new Error('no checkout url');
    return NextResponse.redirect(url, { status: 303 });
  } catch {
    return NextResponse.redirect(new URL('/pricing?error=checkout', req.url));
  }
}
