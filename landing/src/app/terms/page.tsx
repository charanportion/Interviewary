import type { Metadata } from 'next';
import { Terms } from '@/views/Terms';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Terms & Conditions',
  description:
    'The terms governing your use of the Interviewary Chrome extension and this site, including the early-prototype notice and your responsibilities when using your own API keys.',
  path: '/terms',
});

export default function Page() {
  return <Terms />;
}
