// Reprice existing Polar products to the amounts in ./prices.ts.
//
// Run: pnpm --filter @interview-copilot/server polar:reprice
//
// Use this when products already exist (so setupPolar.ts would abort) and you only
// want to change their prices. Polar archives the old price and creates a new one,
// but the PRODUCT id stays the same — so server/.env, checkout links, and webhooks
// all keep working untouched. Edit the amounts in ./prices.ts, then run this.
//
// Notes:
//   • Each product gets BOTH an INR and a USD price (see ./prices.ts). Polar shows
//     the buyer their local currency at checkout based on their IP. To make every
//     non-India country land on USD (not INR), set the org's DEFAULT presentment
//     currency to USD in the Polar dashboard — see ./prices.ts for the full rule.
//   • New checkouts use the new prices immediately. Existing active subscriptions
//     keep the price they signed up at (grandfathered) until migrated from the
//     Polar dashboard — repricing does not retroactively change live subs.
//
// Needs POLAR_ACCESS_TOKEN + the POLAR_PRODUCT_* ids in server/.env.

import 'dotenv/config';
import { Polar } from '@polar-sh/sdk';
import { PLAN, PRODUCT_ENV, fixedPrices, type PlanKey } from './prices.ts';

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const server = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox';

if (!accessToken) {
  console.error('Missing POLAR_ACCESS_TOKEN in server/.env');
  process.exit(1);
}

const polar = new Polar({ accessToken, server });

async function main() {
  console.log(`Repricing Polar products (${server})…\n`);
  let updated = 0;
  const skipped: string[] = [];

  for (const key of Object.keys(PLAN) as PlanKey[]) {
    const plan = PLAN[key];
    const productId = process.env[PRODUCT_ENV[key]];
    if (!productId) {
      console.warn(`- ${key}: ${PRODUCT_ENV[key]} not set — skipping`);
      skipped.push(key);
      continue;
    }

    process.stdout.write(
      `- ${key} → ₹${(plan.inr / 100).toLocaleString('en-IN')} / $${(plan.usd / 100).toFixed(2)} (${productId}) … `,
    );
    await polar.products.update({
      id: productId,
      productUpdate: {
        // Omitting existing prices archives them; these become the product's prices
        // (INR + USD). The org default currency must be one of these (it is — INR).
        prices: fixedPrices(plan),
      },
    } as any);
    console.log('done');
    updated++;
  }

  console.log(`\n✅ Repriced ${updated} product(s).${skipped.length ? ` Skipped: ${skipped.join(', ')}.` : ''}`);
  console.log('Product ids are unchanged — server/.env and checkout links still valid.');
  console.log('New checkouts use the new prices; existing subscriptions are grandfathered until migrated in the Polar dashboard.');
}

main().catch((err) => {
  const detail = JSON.stringify(err?.body ?? err?.message ?? err);
  if (/presentment currency/i.test(detail)) {
    console.error(
      '\nReprice failed: Polar rejected the price set because your org\'s default' +
        '\npresentment currency is not among the prices. This script sends INR + USD;' +
        '\nif your org default is some other currency, add it in ./prices.ts (fixedPrices)' +
        '\nor change the org default in the Polar dashboard, then re-run.',
    );
  } else {
    console.error('\nReprice failed:', err?.body ?? err?.message ?? err);
  }
  process.exit(1);
});
