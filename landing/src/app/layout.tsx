import type { Metadata, Viewport } from 'next';
import { DownloadProvider } from '@/components/DownloadProvider';
// Bundled fonts — same pairing as the extension: editorial serif display + legible grotesk body.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import './globals.css';

export const metadata: Metadata = {
  title: "Interviewary — Run technical interviews you can't technically run",
  description:
    'A Chrome extension that gives non-technical recruiters live answer evaluations, smart follow-up questions, and an auto-generated hiring report — right inside Google Meet. Local-first and bring-your-own-key.',
  openGraph: {
    type: 'website',
    title: 'Interviewary — technical screens that actually work',
    description:
      'Live answer ratings, follow-up questions, and a hiring report inside Google Meet. For recruiters who aren’t engineers.',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#faf8f4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DownloadProvider>{children}</DownloadProvider>
      </body>
    </html>
  );
}
