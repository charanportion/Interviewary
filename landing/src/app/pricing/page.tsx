import type { Metadata } from 'next';
import { Pricing } from '@/views/Pricing';
import { pageMeta } from '@/lib/seo';
import { getCountry, currencyForCountry } from '@/lib/geo';

export const metadata: Metadata = pageMeta({
  title: 'Pricing',
  description:
    'Interviewary pricing — subscribe for monthly interview credits that run on our keys, or buy lifetime access and bring your own Deepgram + LLM keys. One credit is one interview minute.',
  path: '/pricing',
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cc?: string }>;
}) {
  const sp = await searchParams;
  // ?cc=IN overrides geo for testing; otherwise resolve from request headers.
  const currency = currencyForCountry(sp.cc ?? (await getCountry()));
  return <Pricing checkoutError={sp.error === 'checkout'} currency={currency} />;
}
