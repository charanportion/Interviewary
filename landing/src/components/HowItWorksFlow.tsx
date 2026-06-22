'use client';

import { forwardRef, useRef } from 'react';
import { AnimatedBeam } from './ui/animated-beam';
import { MeetIcon, TranscriptIcon, ReportIcon } from './icons';
import { cn } from '@/lib/utils';

const Node = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; label: string }>(
  ({ children, className, label }, ref) => (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        className={cn(
          'z-10 grid h-16 w-16 place-items-center rounded-2xl border bg-surface shadow-[var(--shadow-pop)]',
          className,
        )}
        style={{ borderColor: 'var(--color-line)' }}
      >
        {children}
      </div>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </div>
  ),
);
Node.displayName = 'Node';

/** A little "Meet → Interviewary → Report" flow with light beams running between the nodes. */
export function HowItWorksFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const meetRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex w-full max-w-xl items-start justify-between px-4 py-6"
    >
      <Node ref={meetRef} label="Google Meet" className="text-[var(--color-accent)]">
        <MeetIcon className="h-7 w-7" />
      </Node>

      <Node ref={appRef} label="Interviewary" className="bg-ink text-paper">
        <span className="wordmark text-[26px] leading-none">I</span>
      </Node>

      <Node ref={reportRef} label="Hiring report" className="text-[var(--color-strong)]">
        <ReportIcon className="h-7 w-7" />
      </Node>

      {/* extra floating glyph between transcript + scoring, purely decorative */}
      <TranscriptIcon className="pointer-events-none absolute left-1/2 top-1 hidden h-4 w-4 -translate-x-1/2 text-faint sm:block" />

      <AnimatedBeam containerRef={containerRef} fromRef={meetRef} toRef={appRef} curvature={-40} duration={4} />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={appRef}
        toRef={reportRef}
        curvature={-40}
        duration={4}
        delay={1}
        gradientStartColor="#1d7a52"
        gradientStopColor="#3f7fbf"
      />
    </div>
  );
}
