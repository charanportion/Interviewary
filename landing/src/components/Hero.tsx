import { PanelMock } from './PanelMock';
import { ArrowRightIcon } from './icons';

export function Hero() {
  return (
    <section id="top" className="hero-wash relative overflow-hidden">
      <div className="section grid items-center gap-14 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28">
        {/* Copy */}
        <div className="animate-rise">
          <span
            className="chip mb-5 border px-3 py-1 text-[12px]"
            style={{ borderColor: 'var(--color-line-strong)', background: 'var(--color-surface)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
            Chrome extension · runs inside Google Meet
          </span>

          <h1 className="display text-balance text-[40px] font-semibold leading-[1.05] text-ink sm:text-[56px]">
            Run technical interviews you
            <span style={{ color: 'var(--color-accent)' }}> can’t technically run.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            Interviewary is a side-panel copilot for non-technical recruiters. As the
            candidate speaks, it rates each answer, tells you <em>why</em>, and suggests the
            follow-up that probes real depth — then hands you a hiring report at the end.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/pricing" className="btn btn-lg btn-primary">
              See plans &amp; pricing
            </a>
            <a href="#how" className="btn btn-lg btn-secondary">
              See how it works
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-5 text-[13px] text-muted">
            Subscriptions from ₹699/mo · or lifetime + bring your own keys
          </p>
        </div>

        {/* Product visual */}
        <div className="relative animate-rise" style={{ animationDelay: '120ms' }}>
          <div className="dot-grid absolute -inset-6 -z-10 rounded-3xl opacity-60" />
          <PanelMock />
        </div>
      </div>
    </section>
  );
}
