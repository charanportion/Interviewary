// Single source of truth for product pricing + credit grants, shared by the Polar
// bootstrap (setupPolar.ts) and the reprice (repricePolar.ts) script so the two
// can never drift.
//
// MULTI-CURRENCY: every product is priced in BOTH INR and USD. Polar shows each
// buyer their local currency at checkout (India → INR, elsewhere → USD when USD is
// the org default) based on the customer's IP, falling back to the organization's
// DEFAULT presentment currency for any currency that isn't enabled. So:
//   • To get "India → ₹, everyone else → $", set the org's default presentment
//     currency to USD (Polar dashboard) and keep INR enabled. India still resolves
//     to INR (enabled); every other country falls back to the USD default.
//   • If the org default stays INR, India + non-USD countries get INR and only the
//     US gets USD. The reprice/setup scripts work either way (INR, the current
//     default, is always present in the prices, so Polar accepts them).
//
// The marketing/display catalogs mirror these amounts in their own formatted form —
// keep them in sync when you change a price here:
//   • landing/src/lib/pricing.ts   • extension/src/lib/plans.ts   • server/README.md
//
// Amounts are in each currency's MINOR units: USD cents ($ × 100), INR paise (₹ × 100).
// Reference mapping used to set the USD prices (₹95/$, rounded):
//   ₹699→$7  ₹1,999→$21  ₹4,999→$53  ₹2,499→$26  ₹6,999→$74  ₹399→$4  ₹1,799→$19  ₹5,999→$63

export type PlanKey =
  | 'sub_starter'
  | 'sub_pro'
  | 'sub_team'
  | 'life_starter'
  | 'life_pro'
  | 'topup_small'
  | 'topup_medium'
  | 'topup_large';

export interface PlanSpec {
  name: string;
  /** Price in USD cents. */
  usd: number;
  /** Price in INR paise. */
  inr: number;
  credits: number;
  rollover: boolean;
  interval: 'month' | null;
}

// Subscriptions grant credits per cycle (rollover off); lifetime/top-ups roll over.
export const PLAN: Record<PlanKey, PlanSpec> = {
  sub_starter: { name: 'Interviewary Starter (Monthly)', usd: 700, inr: 69900, credits: 250, rollover: false, interval: 'month' },
  sub_pro: { name: 'Interviewary Pro (Monthly)', usd: 2100, inr: 199900, credits: 800, rollover: false, interval: 'month' },
  sub_team: { name: 'Interviewary Team (Monthly)', usd: 5300, inr: 499900, credits: 2500, rollover: false, interval: 'month' },
  life_starter: { name: 'Interviewary Lifetime Starter', usd: 2600, inr: 249900, credits: 200, rollover: true, interval: null },
  life_pro: { name: 'Interviewary Lifetime Pro', usd: 7400, inr: 699900, credits: 1000, rollover: true, interval: null },
  topup_small: { name: 'Top-up — 100 credits', usd: 400, inr: 39900, credits: 100, rollover: true, interval: null },
  topup_medium: { name: 'Top-up — 500 credits', usd: 1900, inr: 179900, credits: 500, rollover: true, interval: null },
  topup_large: { name: 'Top-up — 2000 credits', usd: 6300, inr: 599900, credits: 2000, rollover: true, interval: null },
};

/** Both currency prices for a plan, in Polar's `ProductPriceFixedCreate` shape. */
export function fixedPrices(plan: PlanSpec) {
  return [
    { amountType: 'fixed' as const, priceAmount: plan.inr, priceCurrency: 'inr' },
    { amountType: 'fixed' as const, priceAmount: plan.usd, priceCurrency: 'usd' },
  ];
}

/** Maps each plan to the env var that holds its Polar product id. */
export const PRODUCT_ENV: Record<PlanKey, string> = {
  sub_starter: 'POLAR_PRODUCT_SUB_STARTER',
  sub_pro: 'POLAR_PRODUCT_SUB_PRO',
  sub_team: 'POLAR_PRODUCT_SUB_TEAM',
  life_starter: 'POLAR_PRODUCT_LIFE_STARTER',
  life_pro: 'POLAR_PRODUCT_LIFE_PRO',
  topup_small: 'POLAR_PRODUCT_TOPUP_SMALL',
  topup_medium: 'POLAR_PRODUCT_TOPUP_MEDIUM',
  topup_large: 'POLAR_PRODUCT_TOPUP_LARGE',
};
