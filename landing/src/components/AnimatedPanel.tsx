'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Logo } from './Logo';
import { PanelMock } from './PanelMock';

/*
 * A living recreation of the extension's side panel. It loops a tiny scripted
 * interview — the candidate's answer types in, the rating cross-fades from
 * "Analyzing…" to "Strong", and the follow-up question appears.
 *
 * Every region has a FIXED height and content cross-fades in place, so the
 * panel never changes size as it loops (no layout shift in the hero frame).
 * Under reduced motion it falls back to the static <PanelMock />.
 */

const TRANSCRIPT =
  '…so I’d add a database index on the column we search by. It turns a slow full scan into a quick lookup, so reads stay fast even as the data grows.';

// Phase machine: 0 listening · 1 typing · 2 analyzing · 3 rated · 4 follow-up shown
const PHASE_MS: Record<number, number> = { 0: 1400, 2: 1200, 3: 1700, 4: 3200 };
const NEXT_PHASE: Record<number, number> = { 0: 1, 2: 3, 3: 4, 4: 0 };

const EASE = [0.22, 1, 0.36, 1] as const;

const SCORES = [
  { key: 'weak', label: 'Weak', fg: 'var(--color-weak)', bg: 'var(--color-weak-bg)' },
  { key: 'ok', label: 'Adequate', fg: 'var(--color-adequate)', bg: 'var(--color-adequate-bg)' },
  { key: 'strong', label: 'Strong', fg: 'var(--color-strong)', bg: 'var(--color-strong-bg)' },
  { key: 'exceptional', label: 'Exceptional', fg: 'var(--color-exceptional)', bg: 'var(--color-exceptional-bg)' },
] as const;
const ACTIVE_SCORE = 'strong';

function formatTimer(totalSeconds: number) {
  const base = 14 * 60 + 22; // start at 14:22, like a call already in progress
  const t = base + totalSeconds;
  const mm = Math.floor(t / 60);
  const ss = t % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/** A little equalizer of bars — used in the header and the listening state. */
function Waveform({ bars = 4, color = 'currentColor', className = '' }: { bars?: number; color?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full"
          style={{ background: color }}
          animate={{ height: ['25%', '100%', '40%', '85%', '25%'] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.13, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export function AnimatedPanel() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    if (phase === 1) return;
    if (phase === 0) setTyped(0);
    const t = setTimeout(() => setPhase(NEXT_PHASE[phase]), PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  useEffect(() => {
    if (reduce || phase !== 1) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= TRANSCRIPT.length) {
        clearInterval(id);
        setTimeout(() => setPhase(2), 450);
      }
    }, 20);
    return () => clearInterval(id);
  }, [phase, reduce]);

  if (reduce) return <PanelMock />;

  const shownText = phase === 0 ? '' : phase === 1 ? TRANSCRIPT.slice(0, typed) : TRANSCRIPT;
  const evalState = phase < 2 ? 'idle' : phase === 2 ? 'analyzing' : 'rated';
  const fade = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.28, ease: EASE },
  };

  return (
    <div
      className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border bg-surface shadow-[var(--shadow-lift)]"
      style={{ borderColor: 'var(--color-line)' }}
      role="img"
      aria-label="Interviewary side panel: a candidate's answer is rated Strong and a follow-up question is suggested"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-line)' }}>
        <Logo />
        <span
          className="chip gap-1.5 px-2 py-1"
          style={{ background: 'var(--color-weak-bg)', color: 'var(--color-weak)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-rec" />
          <span className="font-semibold tracking-wide">REC</span>
          <Waveform bars={3} className="h-2.5" />
          <span className="tabular-nums">{formatTimer(seconds)}</span>
        </span>
      </div>

      <div className="flex flex-col gap-3 bg-[var(--color-paper)] p-4">
        {/* Transcript — fixed height */}
        <div className="h-[92px]">
          <div className="label-eyebrow mb-1.5 flex items-center justify-between">
            <span>Transcript · Candidate</span>
            {phase === 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-medium normal-case tracking-normal text-[var(--color-accent)]">
                <Waveform bars={4} color="var(--color-accent)" className="h-3" />
                listening
              </span>
            )}
          </div>
          <div className="h-[64px]">
            <AnimatePresence mode="wait">
              {phase === 0 ? (
                <motion.div key="listening" {...fade} className="flex h-full items-center">
                  <Waveform bars={22} color="var(--color-line-strong)" className="h-7 w-full justify-between" />
                </motion.div>
              ) : (
                <motion.p key="text" {...fade} className="text-[13px] leading-relaxed text-ink-soft">
                  “{shownText}
                  {phase === 1 && <span className="animate-caret text-[var(--color-accent)]">▍</span>}”
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Evaluation — fixed height, content cross-fades in place */}
        <div className="card relative h-[128px] overflow-hidden">
          <AnimatePresence mode="wait">
            {evalState === 'idle' && (
              <motion.div key="idle" {...fade} className="absolute inset-0 flex items-center gap-2 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: 'var(--color-paper-sunk)' }}>
                  <Waveform bars={3} color="var(--color-faint)" className="h-3" />
                </span>
                <span className="text-[12.5px] text-muted">Waiting for the candidate to finish…</span>
              </motion.div>
            )}

            {evalState === 'analyzing' && (
              <motion.div key="analyzing" {...fade} className="absolute inset-0 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="label-eyebrow">Answer rating</span>
                  <span className="chip chip-topic gap-1.5">
                    <Waveform bars={3} color="var(--color-muted)" className="h-2.5" />
                    Analyzing…
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-full rounded-full animate-shimmer" style={{ background: 'var(--color-paper-sunk)' }} />
                  <div className="h-2.5 w-5/6 rounded-full animate-shimmer" style={{ background: 'var(--color-paper-sunk)' }} />
                  <div className="h-2.5 w-2/3 rounded-full animate-shimmer" style={{ background: 'var(--color-paper-sunk)' }} />
                </div>
              </motion.div>
            )}

            {evalState === 'rated' && (
              <motion.div
                key="rated"
                {...fade}
                className="absolute inset-0 border-l-[3px] p-3 pl-[10px]"
                style={{ borderColor: 'var(--color-strong)' }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="label-eyebrow">Answer rating</span>
                  <motion.span
                    className="chip"
                    style={{ background: 'var(--color-strong-bg)', color: 'var(--color-strong)' }}
                    initial={{ scale: 0.7 }}
                    animate={{ scale: [0.7, 1.12, 1] }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    ● Strong
                  </motion.span>
                </div>
                <p className="text-[12.5px] leading-snug text-ink-soft">
                  Names the right fix <em>and</em> the trade-off — not just a buzzword.
                </p>
                {/* Score meter */}
                <div className="mt-2.5 flex gap-1">
                  {SCORES.map((s, i) => {
                    const active = s.key === ACTIVE_SCORE;
                    return (
                      <motion.span
                        key={s.key}
                        className="flex-1 rounded-full px-1 py-1 text-center text-[9px] font-semibold"
                        style={{
                          background: active ? s.bg : 'var(--color-paper-sunk)',
                          color: active ? s.fg : 'var(--color-faint)',
                        }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 + i * 0.05, ease: EASE }}
                      >
                        {s.label}
                      </motion.span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Suggested follow-up — fixed height */}
        <div
          className="card relative h-[96px] overflow-hidden"
          style={{ borderColor: 'var(--color-accent-soft)' }}
        >
          <AnimatePresence mode="wait">
            {phase < 4 ? (
              <motion.div key="fu-idle" {...fade} className="absolute inset-0 flex items-center gap-2 p-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-faint)' }} />
                <span className="text-[12.5px] text-muted">A smart follow-up will appear here.</span>
              </motion.div>
            ) : (
              <motion.div key="fu-shown" {...fade} className="absolute inset-0 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="chip" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                    ↳ Ask next
                  </span>
                </div>
                <p className="text-[13px] font-medium leading-snug text-ink">
                  “What’s the downside of that index — what does it cost you when you write data?”
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
