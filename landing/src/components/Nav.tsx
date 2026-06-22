'use client';

import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const LINKS = [
  { href: '#problem', label: 'Problem' },
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '#setup', label: 'Setup' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'border-b bg-[var(--color-paper)]/85 backdrop-blur-md'
          : 'border-b border-transparent'
      }`}
      style={scrolled ? { borderColor: 'var(--color-line)' } : undefined}
    >
      <nav className="section flex h-16 items-center justify-between">
        <a href="#top" className="shrink-0" aria-label="Interviewary — home">
          <Logo />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a href="/pricing" className="btn btn-sm btn-primary shrink-0">
          Get started
        </a>
      </nav>
    </header>
  );
}
