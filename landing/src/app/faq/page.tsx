import type { Metadata } from 'next';
import { HelpFaq } from '@/views/HelpFaq';

export const metadata: Metadata = { title: 'Help & FAQ — Interviewary' };

export default function Page() {
  return <HelpFaq />;
}
