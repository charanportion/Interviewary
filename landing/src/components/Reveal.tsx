'use client';

import type { ElementType, ReactNode, CSSProperties } from 'react';
import { useReveal } from '../hooks/useReveal';

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger child reveals by passing an incremental delay (ms). */
  delay?: number;
  style?: CSSProperties;
};

/** Wraps content in a scroll-triggered fade-and-rise. */
export function Reveal({ children, as: Tag = 'div', className = '', delay = 0, style }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Tag>
  );
}
