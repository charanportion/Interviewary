import { Reveal } from './Reveal';

export function Problem() {
  return (
    <section id="problem" className="section section-pad">
      <Reveal className="max-w-2xl">
        <div className="label-eyebrow mb-3">The problem</div>
        <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          A recruiter can hear the answer. They just can’t tell if it’s any good.
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
          Startups run technical screens with whoever’s available — a recruiter, an ops
          lead, the founder. They can read the questions and nod along. But they can’t tell
          a senior answer from a memorized one, or decide what to ask next. So the wrong
          people pass the screen and waste an engineer’s time in round two.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Reveal>
          <div
            className="card h-full p-6"
            style={{ background: 'var(--color-weak-bg)', borderColor: 'transparent' }}
          >
            <div className="label-eyebrow mb-3" style={{ color: 'var(--color-weak)' }}>
              Without Interviewary
            </div>
            <ul className="flex flex-col gap-2.5 text-[14.5px] text-ink-soft">
              {[
                'Every answer sounds equally plausible.',
                '“Was that a good answer?” goes unanswered.',
                'No idea what to ask next to test for depth.',
                'False positives bounce back from engineering.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span style={{ color: 'var(--color-weak)' }}>✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div
            className="card h-full p-6"
            style={{ background: 'var(--color-strong-bg)', borderColor: 'transparent' }}
          >
            <div className="label-eyebrow mb-3" style={{ color: 'var(--color-strong)' }}>
              With Interviewary
            </div>
            <ul className="flex flex-col gap-2.5 text-[14.5px] text-ink-soft">
              {[
                'Each answer gets a rating + a one-line reason.',
                'You see exactly why it was strong or weak.',
                'Smart follow-ups appear in ~2 seconds.',
                'A hiring report your engineers will trust.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span style={{ color: 'var(--color-strong)' }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
