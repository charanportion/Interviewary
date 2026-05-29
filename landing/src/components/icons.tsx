import type { CSSProperties, SVGProps } from 'react';

/* Inline SVGs in the extension's house style: 1.75px stroke, round caps/joins. */

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

type IconProps = { className?: string; style?: CSSProperties };

export function DownloadIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function SparkIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </svg>
  );
}

export function GaugeIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M12 14 9 9" />
      <path d="M3.5 16a8.5 8.5 0 1 1 17 0" />
      <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function QuestionIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8v.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function TranscriptIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M4 5h16M4 10h10M4 15h16M4 20h7" />
    </svg>
  );
}

export function ReportIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M7 3h7l5 5v13a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 16h4" />
    </svg>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function MeetIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="m15 10 6-3v10l-6-3" />
    </svg>
  );
}

export function PlugIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="M9 2v5M15 2v5" />
      <path d="M7 7h10v3a5 5 0 0 1-10 0V7Z" />
      <path d="M12 15v7" />
    </svg>
  );
}

export function CoinIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.2A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3C15 15.8 13.7 16.7 12 16.7a3 3 0 0 1-2.5-1.2" />
      <path d="M12 6.5v1.4M12 16.6V18" />
    </svg>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <svg {...base} className={p.className} style={p.style} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
