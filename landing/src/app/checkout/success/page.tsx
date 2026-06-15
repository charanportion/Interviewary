import type { Metadata } from 'next';
import { MinimalHeader } from '@/components/MinimalHeader';
import { Footer } from '@/components/Footer';
import { DownloadIcon } from '@/components/icons';
import { DOWNLOAD_HREF_LIFETIME, DOWNLOAD_HREF_SUBSCRIPTION } from '@/lib/site';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMeta({
    title: 'Payment complete',
    description: 'Your Interviewary purchase is complete. Install the extension and activate your license key.',
    path: '/checkout/success',
  }),
  robots: { index: false, follow: false },
};

type Edition = 'lifetime' | 'subscription' | 'topup';

function downloadFor(edition: Edition): { href: string; label: string } | null {
  if (edition === 'lifetime') return { href: DOWNLOAD_HREF_LIFETIME, label: 'Download Interviewary (Lifetime)' };
  if (edition === 'subscription') return { href: DOWNLOAD_HREF_SUBSCRIPTION, label: 'Download Interviewary' };
  return null; // top-up: credits added to an existing install, no download
}

export default async function Page({ searchParams }: { searchParams: Promise<{ edition?: string }> }) {
  const sp = await searchParams;
  const edition: Edition =
    sp.edition === 'subscription' ? 'subscription' : sp.edition === 'topup' ? 'topup' : 'lifetime';
  const download = downloadFor(edition);

  const steps =
    edition === 'topup'
      ? [
          { title: 'Credits added', body: 'Your top-up credits are on their way to your account.' },
          { title: 'Open the extension', body: 'Open the side panel — your new balance shows up after you re-activate your license (Settings → Activate) or on the next launch.' },
        ]
      : [
          { title: 'Find your license key', body: 'We’ve emailed it to you (also on your Polar receipt). It looks like IVWY-XXXX-XXXX-XXXX.' },
          { title: 'Install the extension', body: 'Download below, then load it in Chrome (Developer mode → Load unpacked). The setup guide walks through it.' },
          {
            title: 'Activate',
            body:
              edition === 'subscription'
                ? 'Open the side panel → Settings → paste your license key → Activate. It runs on our keys using your credits.'
                : 'Open the side panel → Settings → paste your license key → Activate. Use your included credits, or add your own keys to run for free.',
          },
        ];

  return (
    <>
      <MinimalHeader />
      <main className="section section-pad">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: 'var(--color-strong)' }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="display mt-5 text-balance text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
            You’re all set — payment complete
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-soft">
            {edition === 'topup'
              ? 'Your credits have been added. Here’s how to see them.'
              : 'A few quick steps and you’ll be running sharper technical screens.'}
          </p>
        </div>

        <ol className="mx-auto mt-10 flex max-w-xl flex-col gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card flex gap-4 p-5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--color-ink)' }}
              >
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-ink">{s.title}</div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {download && (
          <div className="mt-9 flex flex-col items-center gap-3">
            <a href={download.href} download className="btn btn-lg btn-accent">
              <DownloadIcon className="h-4 w-4" />
              {download.label}
            </a>
            <a href="/faq" className="text-sm font-medium text-ink-soft underline-offset-2 hover:underline">
              Need help installing? Read the setup guide →
            </a>
          </div>
        )}
      </main>
      <Footer showCta={false} />
    </>
  );
}
