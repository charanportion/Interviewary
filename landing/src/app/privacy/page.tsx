import type { Metadata } from 'next';
import { PrivacyPolicy } from '@/views/PrivacyPolicy';

export const metadata: Metadata = { title: 'Privacy Policy — Interviewary' };

export default function Page() {
  return <PrivacyPolicy />;
}
