// One-shot Polar sandbox bootstrap: creates the license-key benefit, four
// meter-credit benefits, and the four products (lifetime / subscription /
// topups), attaches benefits, and writes the product ids back into server/.env.
//
// Run: pnpm --filter @interview-copilot/server polar:setup
//
// Needs POLAR_ACCESS_TOKEN, POLAR_ORGANIZATION_ID, POLAR_METER_ID in server/.env.
// Idempotency guard: aborts if POLAR_PRODUCT_LIFETIME is already set, to avoid
// creating duplicate products. Prices are sandbox defaults — tweak as you like.

import 'dotenv/config';
import { Polar } from '@polar-sh/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const organizationId = process.env.POLAR_ORGANIZATION_ID;
const meterId = process.env.POLAR_METER_ID;
const server = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox';

if (!accessToken || !organizationId || !meterId) {
  console.error('Need POLAR_ACCESS_TOKEN, POLAR_ORGANIZATION_ID, POLAR_METER_ID in server/.env');
  process.exit(1);
}
if (process.env.POLAR_PRODUCT_SUB_PRO) {
  console.error('POLAR_PRODUCT_SUB_PRO is already set — products look created already. Aborting to avoid duplicates.');
  process.exit(1);
}

const polar = new Polar({ accessToken, server });

// ── Credit grants (interview minutes) + prices ──
// price is in the org's minor units (INR → paise, i.e. ₹ × 100; ₹60 is the min).
// Subscriptions grant credits per cycle (rollover off); lifetime/top-ups roll over.
const PLAN = {
  sub_starter: { name: 'Interviewary Starter (Monthly)', price: 69900, credits: 250, rollover: false, interval: 'month' as const },
  sub_pro: { name: 'Interviewary Pro (Monthly)', price: 199900, credits: 800, rollover: false, interval: 'month' as const },
  sub_team: { name: 'Interviewary Team (Monthly)', price: 499900, credits: 2500, rollover: false, interval: 'month' as const },
  life_starter: { name: 'Interviewary Lifetime Starter', price: 249900, credits: 200, rollover: true, interval: null as null | 'month' },
  life_pro: { name: 'Interviewary Lifetime Pro', price: 699900, credits: 1000, rollover: true, interval: null },
  topup_small: { name: 'Top-up — 100 credits', price: 39900, credits: 100, rollover: true, interval: null },
  topup_medium: { name: 'Top-up — 500 credits', price: 179900, credits: 500, rollover: true, interval: null },
  topup_large: { name: 'Top-up — 2000 credits', price: 599900, credits: 2000, rollover: true, interval: null },
} as const;

type Key = keyof typeof PLAN;

async function createMeterCredit(_label: string, units: number, rollover: boolean): Promise<string> {
  const b: any = await polar.benefits.create({
    type: 'meter_credit',
    description: `${units} interview minutes`, // Polar caps this at 42 chars
    properties: { units, rollover, meterId: meterId! },
  } as any);
  return b.id as string;
}

// The org has a default presentment currency that prices must use; it isn't
// exposed on the org object, so we discover it by trying USD then alternatives
// and cache the first that works.
const CURRENCY_CANDIDATES = ['usd', 'inr', 'eur', 'gbp', 'sgd', 'aud', 'cad'];
let workingCurrency: string | null = null;

async function createProduct(name: string, priceAmount: number, interval: null | 'month'): Promise<string> {
  const tryOrder = workingCurrency ? [workingCurrency] : CURRENCY_CANDIDATES;
  let lastErr: unknown;
  for (const priceCurrency of tryOrder) {
    try {
      const p: any = await polar.products.create({
        name,
        recurringInterval: interval,
        prices: [{ amountType: 'fixed', priceAmount, priceCurrency }],
      } as any);
      if (!workingCurrency) {
        workingCurrency = priceCurrency;
        console.log(`  (using currency: ${priceCurrency})`);
      }
      return p.id as string;
    } catch (err: any) {
      const detail = JSON.stringify(err?.body ?? err?.message ?? '');
      // Only keep trying for the presentment-currency error; rethrow anything else.
      if (!/presentment currency/i.test(detail)) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

async function attach(productId: string, benefitIds: string[]): Promise<void> {
  await polar.products.updateBenefits({
    id: productId,
    productBenefitsUpdate: { benefits: benefitIds },
  } as any);
}

async function main() {
  console.log('Creating license-key benefit…');
  const licenseKey: any = await polar.benefits.create({
    type: 'license_keys',
    description: 'Interviewary access license',
    properties: { prefix: 'IVWY', activations: { limit: 5, enableCustomerAdmin: false } },
  } as any);
  const licenseKeyId = licenseKey.id as string;
  console.log('  license_keys benefit:', licenseKeyId);

  const productIds = {} as Record<Key, string>;
  for (const key of Object.keys(PLAN) as Key[]) {
    const plan = PLAN[key];
    console.log(`Creating ${key} (${plan.name}, ${(plan.price / 100).toFixed(2)}, ${plan.credits} credits)…`);
    const creditId = await createMeterCredit(plan.name, plan.credits, plan.rollover);
    const productId = await createProduct(plan.name, plan.price, plan.interval);
    // Subscriptions + lifetime also grant a license key (the auth token); top-ups
    // only add credits.
    const grantsLicense = key.startsWith('sub_') || key.startsWith('life_');
    const benefits = grantsLicense ? [licenseKeyId, creditId] : [creditId];
    await attach(productId, benefits);
    productIds[key] = productId;
    console.log(`  product: ${productId}`);
  }

  // Write product ids back into server/.env (append the line if it's not present).
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  let env = readFileSync(envPath, 'utf8');
  const set = (k: string, v: string) => {
    const line = `${k}=${v}`;
    if (new RegExp(`^${k}=.*$`, 'm').test(env)) env = env.replace(new RegExp(`^${k}=.*$`, 'm'), line);
    else env += (env.endsWith('\n') ? '' : '\n') + line + '\n';
  };
  set('POLAR_PRODUCT_SUB_STARTER', productIds.sub_starter);
  set('POLAR_PRODUCT_SUB_PRO', productIds.sub_pro);
  set('POLAR_PRODUCT_SUB_TEAM', productIds.sub_team);
  set('POLAR_PRODUCT_LIFE_STARTER', productIds.life_starter);
  set('POLAR_PRODUCT_LIFE_PRO', productIds.life_pro);
  set('POLAR_PRODUCT_TOPUP_SMALL', productIds.topup_small);
  set('POLAR_PRODUCT_TOPUP_MEDIUM', productIds.topup_medium);
  set('POLAR_PRODUCT_TOPUP_LARGE', productIds.topup_large);
  writeFileSync(envPath, env);

  console.log('\n✅ Done. Product ids written to server/.env:');
  for (const key of Object.keys(productIds) as Key[]) console.log(`  ${key}: ${productIds[key]}`);
  console.log('\nNext: add OPENAI_API_KEY + DEEPGRAM_ADMIN_KEY/PROJECT_ID, then run the server.');
}

main().catch((err) => {
  console.error('Setup failed:', err?.body ?? err?.message ?? err);
  process.exit(1);
});
