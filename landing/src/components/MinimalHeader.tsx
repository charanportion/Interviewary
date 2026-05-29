import { Logo } from './Logo';
import { ArrowRightIcon } from './icons';

/** Sticky header used on standalone pages (legal, help) — logo + back to site. */
export function MinimalHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b bg-[var(--color-paper)]/85 backdrop-blur-md"
      style={{ borderColor: 'var(--color-line)' }}
    >
      <nav className="section flex h-16 items-center justify-between">
        <a href="/" aria-label="Interviewary — home">
          <Logo />
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Back to site
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </nav>
    </header>
  );
}
