import { Reveal } from './Reveal';
import { HowItWorksFlow } from './HowItWorksFlow';

const STEPS = [
  {
    n: '01',
    title: 'Add the role',
    time: '~1 min',
    body: 'Open the side panel in Google Meet and paste in the job description and the candidate’s résumé. You instantly get 5–7 questions to start with — each with a note on what a good answer sounds like.',
  },
  {
    n: '02',
    title: 'Just talk',
    time: 'live',
    body: 'Run the call like normal. Interviewary writes down what both of you say and keeps track of who said what, so you never lose your place.',
  },
  {
    n: '03',
    title: 'See if it was good',
    time: '~2 s',
    body: 'The second the candidate stops talking, you get a score — Weak, Adequate, Strong, or Exceptional — with one line on why. Plus the next smart question to ask.',
  },
  {
    n: '04',
    title: 'Get the report',
    time: '~1 min',
    body: 'Click End and download a clean report: a summary, every question with its score, strengths, concerns, and a clear hire / don’t-hire call — ready to share.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[var(--color-paper-sunk)]">
      <div className="section section-pad">
        <Reveal className="max-w-2xl">
          <div className="label-eyebrow mb-3">How it works</div>
          <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            From “hello” to a hiring call — without leaving the meeting.
          </h2>
        </Reveal>

        <Reveal className="mt-10">
          <HowItWorksFlow />
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <div className="card flex h-full flex-col p-6 transition-shadow duration-200 hover:shadow-[var(--shadow-pop)]">
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="display text-[26px] font-semibold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {s.n}
                  </span>
                  <span className="chip chip-topic">{s.time}</span>
                </div>
                <h3 className="text-[17px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
