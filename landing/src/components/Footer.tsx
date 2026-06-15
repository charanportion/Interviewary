import { Logo } from './Logo';

const SECTION_LINKS = [
  { href: '/#problem', label: 'Problem' },
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#setup', label: 'Setup' },
];

const LEGAL_LINKS = [
  { href: '/faq', label: 'Help & FAQ' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/security', label: 'Security' },
];

/** `showCta` is turned off on legal pages, where the big download band is noise. */
export function Footer({ showCta = true }: { showCta?: boolean }) {
  return (
    <footer className="rule">
      {showCta && (
        <div className="section py-16 text-center sm:py-20">
          <h2 className="display mx-auto max-w-2xl text-balance text-[28px] font-semibold leading-tight text-ink sm:text-[36px]">
            Give your next technical screen a second set of ears.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-ink-soft">
            Pick a plan, activate your license, and run a sharper interview today.
          </p>
          <div className="mt-7 flex justify-center">
            <a href="/pricing" className="btn btn-lg btn-primary">
              See plans &amp; pricing
            </a>
          </div>
        </div>
      )}

      <div className={showCta ? 'rule' : ''}>
        <div className="section flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            {SECTION_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
            <span className="hidden h-3 w-px bg-line-strong sm:inline-block" />
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="section pb-8">
          <p className="text-[12.5px] text-faint">
            Early prototype · local-first · bring-your-own-key · your interview data never leaves your browser.
          </p>
        </div>
      </div>
    </footer>
  );
}
