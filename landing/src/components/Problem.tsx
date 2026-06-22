import { Reveal } from './Reveal';

export function Problem() {
  return (
    <section id="problem" className="section section-pad">
      <Reveal className="max-w-2xl">
        <div className="label-eyebrow mb-3">The problem</div>
        <h2 className="display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          A great answer and a memorized one sound exactly the same.
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
          Most startups let a recruiter or founder run the first coding interview. They can
          read the questions out loud. But they can’t tell a real expert from someone who
          just memorized the right words. So the wrong people pass — and waste an engineer’s
          time later.
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
                'Every answer just sounds fine.',
                '“Was that actually good?” — no idea.',
                'You don’t know what to ask next.',
                'Weak hires slip through to your engineers.',
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
                'Each answer gets a score and a reason.',
                'You see why it was strong or weak.',
                'The next smart question appears in ~2 seconds.',
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
