// Display catalog for the paywall + settings. Prices here are display-only — the
// real prices live in Polar (server/.env product ids). Keep these in sync with
// server/src/scripts/setupPolar.ts. Credits are interview minutes.

import type { ProductKind } from '@interview-copilot/shared';

// Marketing pricing page where purchases happen (the extension itself no longer
// runs the initial checkout — see PaywallView). Overridable for dev/staging.
export const PRICING_URL = (
  import.meta.env.VITE_PRICING_URL || 'https://interviewary.dotportion.com/pricing'
).trim();

export type Currency = 'INR' | 'USD';

export interface PlanDisplay {
  kind: ProductKind;
  name: string;
  /** Formatted price per currency, e.g. { INR: '₹699/mo', USD: '$7/mo' }. */
  price: Record<Currency, string>;
  credits: number;
  blurb: string;
  recommended?: boolean;
}

/**
 * Best-effort local currency for DISPLAY only (India → INR, else → USD). The actual
 * charge currency is decided by Polar from the buyer's IP at checkout, so this just
 * keeps the shown number consistent with what they'll be billed.
 */
export function detectCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/Asia\/(Kolkata|Calcutta)/i.test(tz)) return 'INR';
    if ((navigator.language || '').toLowerCase().endsWith('-in')) return 'INR';
  } catch {
    /* fall through to USD */
  }
  return 'USD';
}

export const SUBSCRIPTION_PLANS: PlanDisplay[] = [
  { kind: 'sub_starter', name: 'Starter', price: { INR: '₹699/mo', USD: '$7/mo' }, credits: 250, blurb: 'Casual recruiters' },
  { kind: 'sub_pro', name: 'Pro', price: { INR: '₹1,999/mo', USD: '$21/mo' }, credits: 800, blurb: 'Active recruiters', recommended: true },
  { kind: 'sub_team', name: 'Team', price: { INR: '₹4,999/mo', USD: '$53/mo' }, credits: 2500, blurb: 'Recruiting teams' },
];

export const LIFETIME_PLANS: PlanDisplay[] = [
  { kind: 'life_starter', name: 'Lifetime Starter', price: { INR: '₹2,499 once', USD: '$26 once' }, credits: 200, blurb: 'Indie devs & technical founders' },
  { kind: 'life_pro', name: 'Lifetime Pro', price: { INR: '₹6,999 once', USD: '$74 once' }, credits: 1000, blurb: 'Heavy users wanting one-time' },
];

export const TOPUP_PLANS: PlanDisplay[] = [
  { kind: 'topup_small', name: '100 credits', price: { INR: '₹399', USD: '$4' }, credits: 100, blurb: '' },
  { kind: 'topup_medium', name: '500 credits', price: { INR: '₹1,799', USD: '$19' }, credits: 500, blurb: '' },
  { kind: 'topup_large', name: '2,000 credits', price: { INR: '₹5,999', USD: '$63' }, credits: 2000, blurb: '' },
];
