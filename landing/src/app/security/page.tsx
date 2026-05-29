import type { Metadata } from 'next';
import { Security } from '@/views/Security';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Security',
  description:
    'Interviewary’s security model: local-first, bring-your-own-key architecture with no hosted backend. Your API keys live in browser storage and interview content never touches our servers.',
  path: '/security',
});

export default function Page() {
  return <Security />;
}
