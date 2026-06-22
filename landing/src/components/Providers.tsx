import { Marquee } from './ui/marquee';
import { Reveal } from './Reveal';
import { AnthropicLogo, OpenAILogo, GeminiLogo, GrokLogo } from './brand/logos';

const PROVIDERS = [
  { name: 'Anthropic', sub: 'Claude', Logo: AnthropicLogo },
  { name: 'OpenAI', sub: 'GPT', Logo: OpenAILogo },
  { name: 'Google', sub: 'Gemini', Logo: GeminiLogo },
  { name: 'xAI', sub: 'Grok', Logo: GrokLogo },
];

export function Providers() {
  return (
    <section className="section pb-8 pt-4">
      <Reveal className="text-center">
        <p className="label-eyebrow">Bring your own AI</p>
        <h2 className="display mt-2 text-[20px] font-semibold text-ink sm:text-[24px]">
          Works with the AI you already trust.
        </h2>
      </Reveal>

      <div className="relative mt-8">
        <Marquee pauseOnHover className="[--duration:26s]">
          {PROVIDERS.map((p) => (
            <div
              key={p.name}
              className="mx-3 flex items-center gap-3 rounded-xl border bg-surface px-6 py-3.5 shadow-[var(--shadow-soft)] transition-colors"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <p.Logo className="h-7 w-7 text-ink" />
              <span className="flex flex-col leading-tight">
                <span className="text-[15px] font-semibold text-ink">{p.name}</span>
                <span className="text-[12px] text-muted">{p.sub}</span>
              </span>
            </div>
          ))}
        </Marquee>
        {/* edge fades */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-24"
          style={{ background: 'linear-gradient(to right, var(--color-paper), transparent)' }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24"
          style={{ background: 'linear-gradient(to left, var(--color-paper), transparent)' }}
        />
      </div>
    </section>
  );
}
