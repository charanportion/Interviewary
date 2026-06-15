import type { Metadata } from 'next';
import { Pricing } from '@/views/Pricing';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Pricing',
  description:
    'Interviewary pricing — subscribe for monthly interview credits that run on our keys, or buy lifetime access and bring your own Deepgram + LLM keys. One credit is one interview minute.',
  path: '/pricing',
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return <Pricing checkoutError={sp.error === 'checkout'} />;
}
