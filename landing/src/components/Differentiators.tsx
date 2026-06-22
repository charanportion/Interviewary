import type { ComponentType, CSSProperties } from 'react';
import { Reveal } from './Reveal';
import { Stagger, StaggerItem } from './motion/Stagger';
import { NumberTicker } from './ui/number-ticker';
import { DotPattern } from './ui/dot-pattern';
import { Meteors } from './ui/meteors';
import { ShieldIcon, MeetIcon, PlugIcon, GaugeIcon, CoinIcon, ReportIcon } from './icons';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

type Item = {
  icon: IconType;
  stat: string;
  count?: { value: number; decimals?: number; prefix?: string; suffix?: string };
  label: string;
  body: string;
};

const ITEMS: Item[] = [
  {
    icon: ShieldIcon,
    stat: 'Local',
    label: 'your data stays put',
    body: 'Your audio, transcripts, résumés, and keys never leave your browser. Any usage stats are anonymous and opt-in.',
  },
  {
    icon: MeetIcon,
    stat: 'In-call',
    label: 'right inside Google Meet',
    body: 'It lives in the Chrome side panel and listens to the call itself — no second app, no switching windows.',
  },
  {
    icon: PlugIcon,
    stat: '4',
    count: { value: 4 },
    label: 'AI providers to choose from',
    body: 'Anthropic, OpenAI, Google, and xAI. Pick whichever you like — you’re never locked in.',
  },
  {
    icon: GaugeIcon,
    stat: '~2 s',
    count: { value: 2, prefix: '~', suffix: ' s' },
    label: 'to score an answer',
    body: 'Scores and follow-ups land fast enough to keep the conversation flowing naturally.',
  },
  {
    icon: CoinIcon,
    stat: '~$0.09',
    count: { value: 0.09, decimals: 2, prefix: '~$' },
    label: 'per interview',
    body: 'On your own keys you just pay the going AI rate — no subscription, no per-seat fees, no markup.',
  },
  {
    icon: ReportIcon,
    stat: '1-click',
    label: 'report at the end',
    body: 'End the call and download a clean write-up — every question with its score, strengths, concerns, and a clear call. Yours to keep and share.',
  },
];

export function Differentiators() {
  return (
    <section className="relative overflow-hidden bg-ink text-paper">
      <DotPattern className="text-white/[0.07]" width={22} height={22} />
      <Meteors number={14} className="bg-white/70" />
      <div className="section section-pad relative">
        <Reveal className="max-w-2xl">
          <div className="label-eyebrow mb-3" style={{ color: 'var(--color-faint)' }}>
            Why it’s different
          </div>
          <h2 className="display text-[30px] font-semibold leading-tight sm:text-[38px]">
            Private. Fast. Yours to control.
          </h2>
        </Reveal>

        <Stagger
          className="mt-12 grid gap-px overflow-hidden rounded-xl sm:grid-cols-2 lg:grid-cols-3"
          style={{ background: 'color-mix(in srgb, var(--color-paper) 14%, transparent)' }}
          stagger={0.07}
        >
          {ITEMS.map((it) => (
            <StaggerItem key={it.label}>
              <div className="h-full bg-ink p-6">
                <it.icon className="h-6 w-6" style={{ color: 'var(--color-accent-soft)' }} />
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="display text-[30px] font-semibold leading-none">
                    {it.count ? (
                      <>
                        {it.count.prefix}
                        <NumberTicker
                          value={it.count.value}
                          decimalPlaces={it.count.decimals ?? 0}
                          className="text-paper"
                        />
                        {it.count.suffix}
                      </>
                    ) : (
                      it.stat
                    )}
                  </span>
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
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
