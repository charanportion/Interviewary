import type { ComponentType } from 'react';
import { Reveal } from './Reveal';
import {
  GaugeIcon,
  SparkIcon,
  QuestionIcon,
  TranscriptIcon,
  ReportIcon,
  ShieldIcon,
} from './icons';

const FEATURES: { icon: ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    icon: GaugeIcon,
    title: 'Real-time answer evaluation',
    body: 'A rating and a one-line reason appear seconds after each answer — written for someone who doesn’t know the tech.',
  },
  {
    icon: SparkIcon,
    title: 'Smart follow-up questions',
    body: 'Contextual probes based on what was just said, so you can tell real understanding from rehearsed buzzwords.',
  },
  {
    icon: QuestionIcon,
    title: 'Tailored starting questions',
    body: 'Upload the JD and résumé to get opening questions matched to the role and the candidate’s seniority.',
  },
  {
    icon: TranscriptIcon,
    title: 'Live diarized transcript',
    body: 'The full conversation, transcribed in real time and split by speaker. Nothing gets lost.',
  },
  {
    icon: ReportIcon,
    title: 'Auto hiring report',
    body: 'A shareable markdown write-up with Q&A, evaluations, strengths, concerns, and a clear recommendation.',
  },
  {
    icon: ShieldIcon,
    title: 'Local-first & bring-your-own-key',
    body: 'No accounts. Your transcripts, résumés, and keys stay in your browser — interview content never touches our servers. Usage analytics are opt-in.',
  },
];

export function Features() {
  return (
    <section id="features" className="section section-pad">
      <Reveal className="max-w-2xl">
        <div className="label-eyebrow mb-3">Features</div>
        <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          Everything a non-technical interviewer needs — and nothing they don’t.
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 70}>
            <div className="card flex h-full flex-col p-6">
              <span
                className="mb-4 grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-[16px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
