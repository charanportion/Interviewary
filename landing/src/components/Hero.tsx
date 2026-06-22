'use client';

import { motion, useReducedMotion } from 'motion/react';
import { AnimatedPanel } from './AnimatedPanel';
import { Parallax } from './motion/Parallax';
import { ArrowRightIcon } from './icons';
import { AuroraText } from './ui/aurora-text';
import { AnimatedShinyText } from './ui/animated-shiny-text';
import { ShimmerButton } from './ui/shimmer-button';
import { Particles } from './ui/particles';
import { BorderBeam } from './ui/border-beam';

const EASE = [0.22, 1, 0.36, 1] as const;

const copyContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const copyItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const FLOAT_CHIPS = [
  { label: 'Weak', bg: 'var(--color-weak-bg)', fg: 'var(--color-weak)', cls: '-left-3 top-10', delay: '0s' },
  { label: 'Strong', bg: 'var(--color-strong-bg)', fg: 'var(--color-strong)', cls: '-right-4 top-24', delay: '1.1s' },
  { label: 'Exceptional', bg: 'var(--color-exceptional-bg)', fg: 'var(--color-exceptional)', cls: '-left-5 bottom-24', delay: '2.2s' },
  { label: 'Adequate', bg: 'var(--color-adequate-bg)', fg: 'var(--color-adequate)', cls: '-right-2 bottom-12', delay: '0.6s' },
];

export function Hero({ startingPrice = '$7' }: { startingPrice?: string }) {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Animated aurora wash + particles, layered over the warm paper ground. */}
      <div className="hero-aurora pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
      {!reduce && (
        <Particles
          className="absolute inset-0 -z-10"
          quantity={90}
          ease={70}
          size={0.6}
          color="#1f4e79"
          staticity={40}
        />
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--color-paper))' }}
        aria-hidden
      />

      <div className="section grid items-center gap-14 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-32">
        {/* Copy */}
        <motion.div
          variants={reduce ? undefined : copyContainer}
          initial={reduce ? undefined : 'hidden'}
          animate={reduce ? undefined : 'show'}
        >
          <motion.div variants={reduce ? undefined : copyItem}>
            <span
              className="chip mb-5 border px-3 py-1 text-[12px]"
              style={{ borderColor: 'var(--color-line-strong)', background: 'var(--color-surface)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-rec" style={{ background: 'var(--color-accent)' }} />
              <AnimatedShinyText className="mx-0 max-w-none text-[12px] font-medium">
                Works right inside Google Meet
              </AnimatedShinyText>
            </span>
          </motion.div>

          <motion.h1
            variants={reduce ? undefined : copyItem}
            className="display text-balance text-[40px] font-semibold leading-[1.05] text-ink sm:text-[58px]"
          >
            You can hear the answer.
            <br />
            But was it any <AuroraText className="font-semibold">good?</AuroraText>
          </motion.h1>

          <motion.p
            variants={reduce ? undefined : copyItem}
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft"
          >
            If you’re not a coder, every tech answer sounds fine. Interviewary listens during your
            Google Meet call and tells you — in plain English — whether the answer was strong or
            weak, and what to ask next. When the call ends, you get a simple hiring report.
          </motion.p>

          <motion.div variants={reduce ? undefined : copyItem} className="mt-8 flex flex-wrap items-center gap-3">
            <ShimmerButton
              onClick={() => {
                window.location.href = '/pricing';
              }}
              className="text-[15px] font-semibold shadow-[var(--shadow-soft)]"
            >
              See plans
            </ShimmerButton>
            <a href="#how" className="btn btn-lg btn-secondary">
              See how it works
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.p variants={reduce ? undefined : copyItem} className="mt-5 text-[13px] text-muted">
            Starts at {startingPrice}/mo · or pay once and bring your own keys
          </motion.p>
        </motion.div>

        {/* Product visual — a faux Google Meet window with the live side panel docked in. */}
        <motion.div
          className="relative"
          initial={reduce ? undefined : { opacity: 0, scale: 0.96, y: 16 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        >
          <div className="glow-blob pointer-events-none absolute inset-6 -z-10 rounded-[2rem]" aria-hidden />

          <div
            className="relative overflow-hidden rounded-2xl border bg-[#15171c] shadow-[var(--shadow-lift)]"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {/* Window title bar */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <span className="text-[11px] font-medium text-white/55">Google Meet — Technical screen</span>
              <span className="hidden text-[11px] text-white/35 sm:inline">meet.google.com</span>
            </div>

            {/* Call body: candidate video tile + docked side panel */}
            <div className="flex gap-2 p-2 pt-0">
              <div
                className="relative hidden flex-1 overflow-hidden rounded-xl sm:block"
                style={{ background: 'radial-gradient(120% 100% at 30% 20%, #2b3550 0%, #161a24 70%)' }}
              >
                <div className="grid h-full min-h-[300px] place-items-center">
                  <div
                    className="grid h-16 w-16 place-items-center rounded-full text-[20px] font-semibold text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #3f7fbf, #4b3fb0)' }}
                  >
                    AR
                  </div>
                </div>
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
                  <span className="text-[11px] font-medium text-white/85">Aarav R. · candidate</span>
                </div>
              </div>

              <div className="w-full sm:w-[360px] sm:shrink-0">
                <AnimatedPanel />
              </div>
            </div>

            {/* Animated beam tracing the window border */}
            {!reduce && <BorderBeam size={160} duration={9} className="opacity-90" />}
            {!reduce && <BorderBeam size={160} duration={9} delay={4.5} colorFrom="#1d7a52" colorTo="#3f7fbf" />}
          </div>

          {/* Floating rating chips */}
          {!reduce && (
            <Parallax speed={-30} className="pointer-events-none absolute inset-0">
              {FLOAT_CHIPS.map((c) => (
                <span
                  key={c.label}
                  className={`chip animate-float absolute border px-2.5 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)] ${c.cls}`}
                  style={{
                    background: c.bg,
                    color: c.fg,
                    borderColor: 'color-mix(in srgb, ' + c.fg + ' 22%, transparent)',
                    animationDelay: c.delay,
                  }}
                >
                  ● {c.label}
                </span>
              ))}
            </Parallax>
          )}
        </motion.div>
      </div>
    </section>
  );
}
