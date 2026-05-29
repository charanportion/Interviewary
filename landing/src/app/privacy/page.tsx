import type { Metadata } from 'next';
import { PrivacyPolicy } from '@/views/PrivacyPolicy';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Privacy Policy',
  description:
    'How Interviewary handles your data: interview audio, transcripts, and résumés are processed in your browser and sent only to your own provider accounts. Read what we do and don’t collect.',
  path: '/privacy',
});

export default function Page() {
  return <PrivacyPolicy />;
}
