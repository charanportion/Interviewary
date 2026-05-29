import type { Metadata } from 'next';
import { HelpFaq } from '@/views/HelpFaq';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = {
  // /help serves the same content as /faq; canonicalize to /faq to avoid duplicate content.
  ...pageMeta({
    title: 'Help & FAQ',
    description:
      'Setup, troubleshooting, and answers to common questions about Interviewary — installing the unpacked extension, adding your Deepgram and LLM keys, capturing Google Meet audio, and costs.',
    path: '/help',
  }),
  alternates: { canonical: '/faq' },
};

export default function Page() {
  return <HelpFaq />;
}
