import type { Metadata } from 'next';
import { Security } from '@/views/Security';

export const metadata: Metadata = { title: 'Security — Interviewary' };

export default function Page() {
  return <Security />;
}
