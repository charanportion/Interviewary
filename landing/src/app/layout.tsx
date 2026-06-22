import type { Metadata, Viewport } from 'next';
import { DownloadProvider } from '@/components/DownloadProvider';
import { JsonLd } from '@/components/JsonLd';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  TWITTER_HANDLE,
} from '@/lib/seo';
import { CONTACT_EMAIL } from '@/lib/site';
// Bundled fonts — same pairing as the extension: editorial serif display + legible grotesk body.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Interviewary — Run technical interviews you can't technically run",
    template: '%s — Interviewary',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Dotportion', url: SITE_URL }],
  creator: 'Dotportion',
  publisher: 'Dotportion',
  category: 'technology',
  keywords: [
    'technical interview',
    'recruiter tools',
    'AI interview copilot',
    'Google Meet interview',
    'live transcription',
    'answer evaluation',
    'follow-up questions',
    'hiring report',
    'Chrome extension',
    'non-technical recruiter',
    'Deepgram',
    'bring your own key',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: 'Interviewary — technical screens that actually work',
    description:
      'Live answer ratings, follow-up questions, and a hiring report inside Google Meet. For recruiters who aren’t engineers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interviewary — technical screens that actually work',
    description:
      'Live answer ratings, follow-up questions, and a hiring report inside Google Meet. For recruiters who aren’t engineers.',
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#faf8f4',
};

/** Site-wide structured data: identifies the site and the product to search engines. */
const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Chrome',
  description: SITE_TAGLINE,
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: {
    '@type': 'Organization',
    name: 'Dotportion',
    url: SITE_URL,
    email: CONTACT_EMAIL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={websiteLd} />
        <JsonLd data={softwareLd} />
        <ScrollProgress />
        <DownloadProvider>{children}</DownloadProvider>
      </body>
    </html>
  );
}
