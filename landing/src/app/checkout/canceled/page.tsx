import type { Metadata } from 'next';
import { MinimalHeader } from '@/components/MinimalHeader';
import { Footer } from '@/components/Footer';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMeta({
    title: 'Checkout canceled',
    description: 'Your checkout was canceled — no charge was made.',
    path: '/checkout/canceled',
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <MinimalHeader />
      <main className="section section-pad">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="display text-balance text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            No charge made
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-ink-soft">
            You left checkout before completing payment, so nothing was charged. Whenever you’re
            ready, pick a plan and you’ll be interviewing in a few minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/pricing" className="btn btn-lg btn-primary">
              Back to pricing
            </a>
            <a href="/" className="btn btn-lg btn-secondary">
              Return home
            </a>
          </div>
          <p className="mx-auto mt-6 max-w-md text-[13px] text-muted">
            Already purchased on another attempt? Check your email for the license key, then open
            the extension → Settings → Activate.
          </p>
        </div>
      </main>
      <Footer showCta={false} />
    </>
  );
}
