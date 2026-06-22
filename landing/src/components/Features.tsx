import type { ComponentType } from 'react';
import { Reveal } from './Reveal';
import { BentoGrid } from './ui/bento-grid';
import { MagicCard } from './ui/magic-card';
import {
  GaugeIcon,
  SparkIcon,
  QuestionIcon,
  TranscriptIcon,
  ReportIcon,
  ShieldIcon,
} from './icons';

type IconType = ComponentType<{ className?: string }>;

type Feature = {
  icon: IconType;
  title: string;
  body: string;
  span: string;
  graphic?: 'ratings' | 'report' | 'transcript';
};

const FEATURES: Feature[] = [
  {
    icon: GaugeIcon,
    title: 'Instant answer scores',
    body: 'A score and a one-line reason pop up seconds after each answer — in plain words, not tech-speak.',
    span: 'lg:col-span-2',
    graphic: 'ratings',
  },
  {
    icon: SparkIcon,
    title: 'The next question, ready',
    body: 'Smart follow-ups based on what was just said — so you can tell real know-how from rehearsed buzzwords.',
    span: 'lg:col-span-1',
  },
  {
    icon: QuestionIcon,
    title: 'Questions made for the role',
    body: 'Paste the job and résumé; get opening questions matched to the job and the person’s level.',
    span: 'lg:col-span-1',
  },
  {
    icon: TranscriptIcon,
    title: 'Live transcript',
    body: 'The whole conversation, written down as it happens and split by who’s talking. Nothing slips by.',
    span: 'lg:col-span-1',
    graphic: 'transcript',
  },
  {
    icon: ReportIcon,
    title: 'A report at the end',
    body: 'One click gives you a shareable write-up: every Q&A, the scores, strengths, concerns, and a clear call.',
    span: 'lg:col-span-1',
    graphic: 'report',
  },
  {
    icon: ShieldIcon,
    title: 'Your data stays yours',
    body: 'No account needed. Your transcripts, résumés, and keys stay in your browser — interview content never hits our servers.',
    span: 'lg:col-span-3',
  },
];

const RATING_PILLS = [
  { label: 'Weak', bg: 'var(--color-weak-bg)', fg: 'var(--color-weak)' },
  { label: 'Adequate', bg: 'var(--color-adequate-bg)', fg: 'var(--color-adequate)' },
  { label: 'Strong', bg: 'var(--color-strong-bg)', fg: 'var(--color-strong)' },
  { label: 'Exceptional', bg: 'var(--color-exceptional-bg)', fg: 'var(--color-exceptional)' },
];

function FeatureGraphic({ kind }: { kind?: Feature['graphic'] }) {
  if (kind === 'ratings') {
    return (
      <div className="pointer-events-none absolute right-5 top-5 hidden flex-col items-end gap-2 sm:flex">
        {RATING_PILLS.map((p, i) => (
          <span
            key={p.label}
            className="chip border px-2.5 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)]"
            style={{
              background: p.bg,
              color: p.fg,
              borderColor: `color-mix(in srgb, ${p.fg} 22%, transparent)`,
              transform: `translateX(${i % 2 === 0 ? '-' : ''}${i * 6}px)`,
            }}
          >
            ● {p.label}
          </span>
        ))}
      </div>
    );
  }
  if (kind === 'report') {
    return (
      <div className="pointer-events-none absolute right-5 top-5 hidden w-28 rounded-lg border bg-paper p-2.5 shadow-[var(--shadow-soft)] sm:block" style={{ borderColor: 'var(--color-line)' }}>
        <div className="h-1.5 w-10 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <div className="mt-2 space-y-1.5">
          {[10, 8, 9, 6].map((w, i) => (
            <div key={i} className="h-1.5 rounded-full" style={{ width: `${w * 3}px`, background: 'var(--color-line-strong)' }} />
          ))}
        </div>
        <span className="mt-2 inline-block chip px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: 'var(--color-strong-bg)', color: 'var(--color-strong)' }}>
          Hire
        </span>
      </div>
    );
  }
  if (kind === 'transcript') {
    return (
      <div className="pointer-events-none absolute right-5 top-5 hidden w-28 space-y-2 sm:block">
        {['accent', 'muted', 'accent'].map((c, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c === 'accent' ? 'var(--color-accent)' : 'var(--color-faint)' }} />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full" style={{ width: `${60 - i * 8}%`, background: 'var(--color-line-strong)' }} />
              <div className="h-1.5 rounded-full" style={{ width: `${90 - i * 6}%`, background: 'var(--color-line)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function Features() {
  return (
    <section id="features" className="section section-pad">
      <Reveal className="max-w-2xl">
        <div className="label-eyebrow mb-3">What you get</div>
        <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          Everything you need to run the interview — nothing you don’t.
        </h2>
      </Reveal>

      <Reveal className="mt-12">
        <BentoGrid className="auto-rows-[16rem] grid-cols-1 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <MagicCard key={f.title} className={`col-span-1 rounded-xl ${f.span}`}>
              <div className="relative flex h-full flex-col justify-end p-6">
                <FeatureGraphic kind={f.graphic} />
                <span
                  className="mb-4 grid h-11 w-11 place-items-center rounded-lg"
                  style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="text-[17px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            </MagicCard>
          ))}
        </BentoGrid>
      </Reveal>
    </section>
  );
}
