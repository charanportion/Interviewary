import type { ComponentType, CSSProperties } from 'react';
import { Reveal } from './Reveal';
import { ShieldIcon, MeetIcon, PlugIcon, GaugeIcon, CoinIcon } from './icons';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

const ITEMS: { icon: IconType; stat: string; label: string; body: string }[] = [
  {
    icon: ShieldIcon,
    stat: 'Local',
    label: 'interview data stays put',
    body: 'Your audio, transcripts, résumés, and keys never leave your browser. Usage analytics are opt-in and anonymous.',
  },
  {
    icon: MeetIcon,
    stat: 'In-call',
    label: 'inside Google Meet',
    body: 'Lives in the Chrome side panel using native tab capture — no second app, no window switching.',
  },
  {
    icon: PlugIcon,
    stat: '4',
    label: 'LLM providers',
    body: 'Anthropic, OpenAI, Google, and xAI. Pick your provider and models; you’re never locked in.',
  },
  {
    icon: GaugeIcon,
    stat: '~2 s',
    label: 'to first insight',
    body: 'A strict latency budget keeps ratings and follow-ups fast enough to keep the conversation flowing.',
  },
  {
    icon: CoinIcon,
    stat: '~$0.09',
    label: 'per interview',
    body: 'You pay your own usage-based API costs. No subscription, no per-seat pricing, no markup.',
  },
];

export function Differentiators() {
  return (
    <section className="bg-ink text-paper">
      <div className="section section-pad">
        <Reveal className="max-w-2xl">
          <div className="label-eyebrow mb-3" style={{ color: 'var(--color-faint)' }}>
            Why it’s different
          </div>
          <h2 className="display text-[30px] font-semibold leading-tight sm:text-[38px]">
            Private by design. Fast by necessity. Yours to control.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl sm:grid-cols-2 lg:grid-cols-3"
          style={{ background: 'color-mix(in srgb, var(--color-paper) 14%, transparent)' }}
        >
          {ITEMS.map((it, i) => (
            <Reveal key={it.label} delay={(i % 3) * 60}>
              <div className="h-full bg-ink p-6">
                <it.icon className="h-6 w-6" style={{ color: 'var(--color-accent-soft)' }} />
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="display text-[30px] font-semibold leading-none">{it.stat}</span>
                  <span className="text-[13px]" style={{ color: 'var(--color-faint)' }}>
                    {it.label}
                  </span>
                </div>
                <p
                  className="mt-3 text-[14px] leading-relaxed"
                  style={{ color: 'color-mix(in srgb, var(--color-paper) 80%, transparent)' }}
                >
                  {it.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
