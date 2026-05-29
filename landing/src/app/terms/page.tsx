import type { Metadata } from 'next';
import { Terms } from '@/views/Terms';

export const metadata: Metadata = { title: 'Terms & Conditions — Interviewary' };

export default function Page() {
  return <Terms />;
}
