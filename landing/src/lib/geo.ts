import 'server-only';
import { headers } from 'next/headers';
import type { Currency } from './pricing';

// Server-side currency selection for display. Mirrors how Polar picks the checkout
// currency (India → INR, everyone else → USD), so what a visitor sees matches what
// they'll be charged. Reads the country from common edge/CDN geo headers; if the
// host doesn't inject one (local dev, or a host without geo), defaults to USD.
//
// Override for testing/QA via ?cc=IN (handled by the page, passed to currencyForCountry).

export async function getCountry(): Promise<string | null> {
  const h = await headers();
  return (
    h.get('x-vercel-ip-country') || // Vercel
    h.get('cf-ipcountry') || // Cloudflare
    h.get('x-country') || // generic / custom proxy
    null
  );
}

export function currencyForCountry(country: string | null | undefined): Currency {
  return country?.toUpperCase() === 'IN' ? 'INR' : 'USD';
}

export async function getCurrency(): Promise<Currency> {
  return currencyForCountry(await getCountry());
}
