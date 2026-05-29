'use client';

import { useState, type ReactNode } from 'react';
import { Reveal } from './Reveal';
import { DownloadButton } from './DownloadButton';
import { KEY_CONSOLES } from '../lib/site';
import { CheckIcon, CopyIcon } from './icons';

/** A monospace value with a copy button — used for chrome://extensions. */
function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is visible to copy by hand */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg border bg-paper-sunk px-3 py-1.5 font-mono text-[13px] text-ink transition-colors hover:bg-paper"
      style={{ borderColor: 'var(--color-line-strong)' }}
    >
      {value}
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-strong)' }} />
      ) : (
        <CopyIcon className="h-3.5 w-3.5 text-muted" />
      )}
    </button>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium underline decoration-1 underline-offset-2"
      style={{ color: 'var(--color-accent)' }}
    >
      {children}
    </a>
  );
}

type Step = { title: string; time?: string; body: ReactNode };

const STEPS: Step[] = [
  {
    title: 'Download & unzip',
    time: '30 s',
    body: (
      <>
        Grab the extension bundle and unzip it anywhere you’ll keep it — Chrome loads the
        extension from this folder, so don’t delete it afterward.
        <div className="mt-3">
          <DownloadButton size="sm" variant="accent" label="Download .zip" />
        </div>
      </>
    ),
  },
  {
    title: 'Load it into Chrome',
    time: '1 min',
    body: (
      <>
        Open the extensions page, turn on <strong>Developer mode</strong> (top-right), click{' '}
        <strong>Load unpacked</strong>, and select the unzipped folder.
        <div className="mt-3">
          <CopyField value="chrome://extensions" />
          <p className="mt-2 text-[12.5px] text-muted">
            Paste this into your address bar — Chrome won’t let pages link to it directly.
            Then pin Interviewary so it’s one click away.
          </p>
        </div>
      </>
    ),
  },
  {
    title: 'Add your keys (one time)',
    time: '2 min',
    body: (
      <>
        Open <ExtLink href="https://meet.google.com/">Google Meet</ExtLink>, open the side
        panel, hit the gear → <strong>Settings</strong>, then paste:
        <ul className="mt-3 flex flex-col gap-2 text-[14px] text-ink-soft">
          <li className="flex gap-2">
            <span style={{ color: 'var(--color-accent)' }}>•</span>
            <span>
              Your <ExtLink href={KEY_CONSOLES.deepgram}>Deepgram</ExtLink> key (transcription —
              comes with $200 of free credit).
            </span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: 'var(--color-accent)' }}>•</span>
            <span>
              An LLM provider + key —{' '}
              <ExtLink href={KEY_CONSOLES.anthropic}>Anthropic</ExtLink>,{' '}
              <ExtLink href={KEY_CONSOLES.openai}>OpenAI</ExtLink>,{' '}
              <ExtLink href={KEY_CONSOLES.google}>Google</ExtLink>, or{' '}
              <ExtLink href={KEY_CONSOLES.xai}>xAI</ExtLink> — then pick a fast model (live) and
              a report model (end of call).
            </span>
          </li>
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">
          Click <strong>Test keys</strong> to confirm they work, then <strong>Save</strong>.
          Keys are remembered on your machine — you only do this once.
        </p>
      </>
    ),
  },
  {
    title: 'Start interviewing',
    time: '1 min',
    body: (
      <>
        Back on the setup screen, drop in the <strong>job description</strong> and{' '}
        <strong>candidate résumé</strong>, choose seniority (Junior / Mid / Senior) and type
        (Screening / Deep dive), and hit <strong>Start interview</strong>. Ratings and
        follow-ups start flowing as soon as the candidate talks.
      </>
    ),
  },
];

export function SetupGuide() {
  return (
    <section id="setup" className="section section-pad">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Intro / CTA column */}
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <div className="label-eyebrow mb-3">Get started</div>
          <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            Set up in under five minutes.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
            There’s no account to create, and your keys and interview data stay on your device.
            Download the extension, load
            it into Chrome, paste your own API keys once, and you’re interviewing.
          </p>
          <div className="mt-6">
            <DownloadButton size="lg" />
          </div>
          <p className="mt-4 text-[12.5px] text-muted">
            Not on the Chrome Web Store yet — this is an early prototype, so it loads as an
            “unpacked” extension. The steps on the right walk you through it.
          </p>
        </Reveal>

        {/* Stepper */}
        <ol className="flex flex-col">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 60} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <span
                  className="absolute left-[15px] top-9 bottom-0 w-px"
                  style={{ background: 'var(--color-line-strong)' }}
                />
              )}
              {/* Step dot */}
              <span
                className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                {i + 1}
              </span>
              <div className="card flex-1 p-5">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-semibold text-ink">{s.title}</h3>
                  {s.time && <span className="chip chip-topic shrink-0">{s.time}</span>}
                </div>
                <div className="text-[14px] leading-relaxed text-ink-soft">{s.body}</div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
