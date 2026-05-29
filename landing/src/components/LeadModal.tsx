'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { recordDownload } from '../lib/leadsClient';
import { Logo } from './Logo';
import { DownloadIcon } from './icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onClose: () => void;
  /** Called after a successful submit — sets the local flag and starts the download. */
  onCaptured: () => void;
};

export function LeadModal({ onClose, onCaptured }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the first field, lock body scroll, close on Esc.
  useEffect(() => {
    emailRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    if (!consent) {
      setError('Please accept the consent checkbox to continue.');
      return;
    }
    setError(null);
    setSubmitting(true);
    // Record the lead, but never block the download on a backend hiccup.
    await recordDownload({ email, phone, consent });
    onCaptured(); // sets flag + triggers the .zip download
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-title"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(27_24_20/0.45)] backdrop-blur-sm animate-rise"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="card animate-rise relative w-full max-w-md rounded-2xl rounded-b-2xl p-6 shadow-[var(--shadow-lift)] sm:p-7"
      >
        <div className="mb-1 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-paper-sunk hover:text-ink"
          >
            ✕
          </button>
        </div>

        <h2 id="lead-title" className="display mt-3 text-[24px] font-semibold leading-tight text-ink">
          Almost there — where should we reach you?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Drop your email and we’ll start the download. We use it to share setup help and product
          updates — never to share your data. See our{' '}
          <a
            href="/privacy"
            className="font-medium underline decoration-1 underline-offset-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Privacy Policy
          </a>
          .
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-soft">
              Work email <span style={{ color: 'var(--color-weak)' }}>*</span>
            </span>
            <input
              ref={emailRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="field-input"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-soft">
              Phone <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 1234"
              className="field-input"
              autoComplete="tel"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-soft">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="field-checkbox mt-0.5"
            />
            <span>
              I agree to be contacted about Interviewary and accept the{' '}
              <a
                href="/privacy"
                className="font-medium underline decoration-1 underline-offset-2"
                style={{ color: 'var(--color-accent)' }}
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-[13px]"
              style={{ background: 'var(--color-weak-bg)', color: 'var(--color-weak)' }}
              role="alert"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn btn-lg btn-primary w-full">
            <DownloadIcon className="h-4 w-4" />
            {submitting ? 'Starting download…' : 'Download the extension'}
          </button>
          <p className="text-center text-[12px] text-muted">Free · no account · ~3 MB</p>
        </form>
      </div>
    </div>
  );
}
