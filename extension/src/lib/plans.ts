// Display catalog for the paywall + settings. Prices here are display-only — the
// real prices live in Polar (server/.env product ids). Keep these in sync with
// server/src/scripts/setupPolar.ts. Credits are interview minutes.

import type { ProductKind } from '@interview-copilot/shared';

// Marketing pricing page where purchases happen (the extension itself no longer
// runs the initial checkout — see PaywallView). Overridable for dev/staging.
export const PRICING_URL = (
  import.meta.env.VITE_PRICING_URL || 'https://interviewary.dotportion.com/pricing'
).trim();

export interface PlanDisplay {
  kind: ProductKind;
  name: string;
  price: string;
  credits: number;
  blurb: string;
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: PlanDisplay[] = [
  { kind: 'sub_starter', name: 'Starter', price: '₹699/mo', credits: 250, blurb: 'Casual recruiters' },
  { kind: 'sub_pro', name: 'Pro', price: '₹1,999/mo', credits: 800, blurb: 'Active recruiters', recommended: true },
  { kind: 'sub_team', name: 'Team', price: '₹4,999/mo', credits: 2500, blurb: 'Recruiting teams' },
];

export const LIFETIME_PLANS: PlanDisplay[] = [
  { kind: 'life_starter', name: 'Lifetime Starter', price: '₹2,499 once', credits: 200, blurb: 'Indie devs & technical founders' },
  { kind: 'life_pro', name: 'Lifetime Pro', price: '₹6,999 once', credits: 1000, blurb: 'Heavy users wanting one-time' },
];

export const TOPUP_PLANS: PlanDisplay[] = [
  { kind: 'topup_small', name: '100 credits', price: '₹399', credits: 100, blurb: '' },
  { kind: 'topup_medium', name: '500 credits', price: '₹1,799', credits: 500, blurb: '' },
  { kind: 'topup_large', name: '2,000 credits', price: '₹5,999', credits: 2000, blurb: '' },
];
