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
import { PLAN, fixedPrices, type PlanSpec } from './prices.ts';

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

// Credit grants (interview minutes) + prices live in ./prices.ts (shared with the
// reprice script). Each product is priced in both INR and USD (see ./prices.ts).
type Key = keyof typeof PLAN;

async function createMeterCredit(_label: string, units: number, rollover: boolean): Promise<string> {
  const b: any = await polar.benefits.create({
    type: 'meter_credit',
    description: `${units} interview minutes`, // Polar caps this at 42 chars
    properties: { units, rollover, meterId: meterId! },
  } as any);
  return b.id as string;
}

// Create a product priced in both INR and USD. Polar requires the org's default
// presentment currency to be among the prices — both are sent, so it's satisfied
// whether the org default is INR or USD.
async function createProduct(name: string, plan: PlanSpec): Promise<string> {
  const p: any = await polar.products.create({
    name,
    recurringInterval: plan.interval,
    prices: fixedPrices(plan),
  } as any);
  return p.id as string;
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
    console.log(`Creating ${key} (${plan.name}, ₹${(plan.inr / 100).toLocaleString('en-IN')} / $${(plan.usd / 100).toFixed(2)}, ${plan.credits} credits)…`);
    const creditId = await createMeterCredit(plan.name, plan.credits, plan.rollover);
    const productId = await createProduct(plan.name, plan);
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
