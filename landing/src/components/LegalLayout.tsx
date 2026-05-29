import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { MinimalHeader } from './MinimalHeader';
import { LEGAL_LAST_UPDATED } from '../lib/site';

const RELATED = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/security', label: 'Security' },
  { href: '/faq', label: 'Help & FAQ' },
];

type Props = {
  title: string;
  intro: string;
  /** Pathname of the current page, so it’s omitted from the cross-links. */
  current: string;
  children: ReactNode;
};

export function LegalLayout({ title, intro, current, children }: Props) {
  return (
    <>
      <MinimalHeader />

      <main className="section max-w-3xl py-16 sm:py-20">
        <div className="label-eyebrow mb-3">Legal</div>
        <h1 className="display text-[34px] font-semibold leading-tight text-ink sm:text-[42px]">
          {title}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{intro}</p>
        <p className="mt-3 text-[13px] text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>

        <div
          className="my-8 rounded-xl border p-4 text-[13.5px] leading-relaxed text-ink-soft"
          style={{ background: 'var(--color-adequate-bg)', borderColor: 'transparent' }}
        >
          <strong className="text-ink">Prototype notice.</strong> Interviewary is an early
          prototype. These documents describe how it works today and are provided for
          transparency — they are not legal advice. Please review them with your own counsel
          before relying on the product for hiring decisions.
        </div>

        <article className="prose">{children}</article>

        {/* Cross-links to the other legal pages */}
        <div className="mt-12 flex flex-wrap gap-3 border-t pt-6" style={{ borderColor: 'var(--color-line)' }}>
          {RELATED.filter((r) => r.href !== current).map((r) => (
            <a key={r.href} href={r.href} className="btn btn-sm btn-secondary">
              {r.label}
            </a>
          ))}
        </div>
      </main>

      <Footer showCta={false} />
    </>
  );
}
