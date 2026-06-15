/**
 * Pricing catalog for the marketing site. Display-only — the actual prices and
 * product ids live in Polar (and in the billing server's env). The `slug` must
 * match the billing server's product enum; the checkout route (/api/checkout)
 * passes it to the billing server's /v1/checkout, which maps it to a Polar id.
 *
 * Keep credits/prices in sync with server/src/scripts/setupPolar.ts.
 */

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
  price: string;
  period?: string; // e.g. '/mo'
  credits: number;
  audience: string;
  highlight?: boolean;
}

export const SUBSCRIPTIONS: Plan[] = [
  { slug: 'sub_starter', name: 'Starter', price: '₹699', period: '/mo', credits: 250, audience: 'Casual recruiters' },
  { slug: 'sub_pro', name: 'Pro', price: '₹1,999', period: '/mo', credits: 800, audience: 'Active recruiters', highlight: true },
  { slug: 'sub_team', name: 'Team', price: '₹4,999', period: '/mo', credits: 2500, audience: 'Recruiting teams' },
];

export const LIFETIME: Plan[] = [
  { slug: 'life_starter', name: 'Lifetime Starter', price: '₹2,499', period: ' once', credits: 200, audience: 'Indie developers & technical founders' },
  { slug: 'life_pro', name: 'Lifetime Pro', price: '₹6,999', period: ' once', credits: 1000, audience: 'Heavy users wanting one-time payment' },
];

export const TOPUPS: Plan[] = [
  { slug: 'topup_small', name: 'Small', price: '₹399', credits: 100, audience: 'Anyone' },
  { slug: 'topup_medium', name: 'Medium', price: '₹1,799', credits: 500, audience: 'Anyone' },
  { slug: 'topup_large', name: 'Large', price: '₹5,999', credits: 2000, audience: 'Anyone' },
];

export const ALL_PLAN_SLUGS: PlanSlug[] = [
  ...SUBSCRIPTIONS,
  ...LIFETIME,
  ...TOPUPS,
].map((p) => p.slug);

/** A credit is one interview minute on our keys (server mode). */
export const CREDIT_UNIT = '1 credit = 1 minute of an interview on our keys';
