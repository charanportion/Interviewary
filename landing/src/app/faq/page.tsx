import type { Metadata } from 'next';
import { HelpFaq } from '@/views/HelpFaq';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Help & FAQ',
  description:
    'Setup, troubleshooting, and answers to common questions about Interviewary — installing the unpacked extension, adding your Deepgram and LLM keys, capturing Google Meet audio, and costs.',
  path: '/faq',
});

export default function Page() {
  return <HelpFaq />;
}
