import { Reveal } from './Reveal';
import { ChevronIcon } from './icons';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Where does my data go?',
    a: 'Your interview content stays with you: audio, transcripts, and résumés are processed in your browser and sent only to your own Deepgram and LLM accounts, and your keys live in local storage. The only things we collect are the email you give us to download and — if you opt in — anonymous usage stats (never transcripts or answers). Full details are in our Privacy Policy.',
  },
  {
    q: 'What does it cost?',
    a: 'The extension is free. You pay your own usage-based API costs, which come to roughly $0.09 per interview for the LLM plus transcription — and Deepgram includes $200 of free credit when you sign up.',
  },
  {
    q: 'Which AI providers can I use?',
    a: 'Anthropic (Claude), OpenAI (GPT), Google (Gemini), and xAI (Grok). You choose a fast model for live ratings and follow-ups, and a higher-quality model for the end-of-call report.',
  },
  {
    q: 'Does it work on Zoom or Teams?',
    a: 'Not in this prototype — it’s built specifically for Google Meet, where it captures the call audio from the browser tab.',
  },
  {
    q: 'Why isn’t it on the Chrome Web Store?',
    a: 'It’s an early prototype, so you install it as an unpacked extension — download the bundle, then “Load unpacked” in Chrome. The setup section above walks through every step.',
  },
  {
    q: 'Do I need to be technical to use it?',
    a: 'No — that’s the whole point. Every rating, follow-up, and report is written for someone who doesn’t know the underlying technology. The one technical-ish step is pasting in API keys, which the guide covers.',
  },
];

export function Faq() {
  return (
    <section className="bg-[var(--color-paper-sunk)]">
      <div className="section section-pad">
        <Reveal className="max-w-2xl">
          <div className="label-eyebrow mb-3">FAQ</div>
          <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            Questions, answered.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-3 lg:grid-cols-2">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={(i % 2) * 70}>
              <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15.5px] font-semibold text-ink">
                  {f.q}
                  <ChevronIcon className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <p className="text-[14.5px] text-ink-soft">
            Running into trouble — like the extension not picking up audio?{' '}
            <a
              href="/faq"
              className="font-medium underline decoration-1 underline-offset-2"
              style={{ color: 'var(--color-accent)' }}
            >
              Visit the Help &amp; FAQ
            </a>{' '}
            for setup and troubleshooting.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
