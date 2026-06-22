/**
 * Pricing catalog for the marketing site. Display-only — the actual prices and
 * product ids live in Polar (and in the billing server's env). The `slug` must
 * match the billing server's product enum; the checkout route (/api/checkout)
 * passes it to the billing server's /v1/checkout, which maps it to a Polar id.
 *
 * Multi-currency: each plan carries an INR and a USD display string. The visitor's
 * currency is resolved server-side (see lib/geo.ts) — India sees ₹, everyone else
 * sees $ — matching the currency Polar charges at checkout.
 *
 * Keep amounts in sync with server/src/scripts/prices.ts.
 */

export type Currency = 'INR' | 'USD';

export type PlanSlug =
  | 'sub_starter'
  | 'sub_pro'
  | 'sub_team'
  | 'life_starter'
  | 'life_pro'
  | 'topup_small'
  | 'topup_medium'
  | 'topup_large';

export interface Plan {
  slug: PlanSlug;
  name: string;
  /** Formatted price per currency, e.g. { INR: '₹699', USD: '$7' }. */
  price: Record<Currency, string>;
  period?: string; // e.g. '/mo'
  credits: number;
  audience: string;
  highlight?: boolean;
}

export const SUBSCRIPTIONS: Plan[] = [
  { slug: 'sub_starter', name: 'Starter', price: { INR: '₹699', USD: '$7' }, period: '/mo', credits: 250, audience: 'Casual recruiters' },
  { slug: 'sub_pro', name: 'Pro', price: { INR: '₹1,999', USD: '$21' }, period: '/mo', credits: 800, audience: 'Active recruiters', highlight: true },
  { slug: 'sub_team', name: 'Team', price: { INR: '₹4,999', USD: '$53' }, period: '/mo', credits: 2500, audience: 'Recruiting teams' },
];

export const LIFETIME: Plan[] = [
  { slug: 'life_starter', name: 'Lifetime Starter', price: { INR: '₹2,499', USD: '$26' }, period: ' once', credits: 200, audience: 'Indie developers & technical founders' },
  { slug: 'life_pro', name: 'Lifetime Pro', price: { INR: '₹6,999', USD: '$74' }, period: ' once', credits: 1000, audience: 'Heavy users wanting one-time payment' },
];

export const TOPUPS: Plan[] = [
  { slug: 'topup_small', name: 'Small', price: { INR: '₹399', USD: '$4' }, credits: 100, audience: 'Anyone' },
  { slug: 'topup_medium', name: 'Medium', price: { INR: '₹1,799', USD: '$19' }, credits: 500, audience: 'Anyone' },
  { slug: 'topup_large', name: 'Large', price: { INR: '₹5,999', USD: '$63' }, credits: 2000, audience: 'Anyone' },
];

export const ALL_PLAN_SLUGS: PlanSlug[] = [
  ...SUBSCRIPTIONS,
  ...LIFETIME,
  ...TOPUPS,
].map((p) => p.slug);

/** A credit is one interview minute on our keys (server mode). */
export const CREDIT_UNIT = '1 credit = 1 minute of an interview on our keys';
