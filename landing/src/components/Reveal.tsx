'use client';

import type { ElementType, ReactNode, CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type Variant = 'rise' | 'fade' | 'scale' | 'left' | 'right';

const OFFSETS: Record<Variant, { x?: number; y?: number; scale?: number }> = {
  rise: { y: 24 },
  fade: {},
  scale: { scale: 0.96 },
  left: { x: -32 },
  right: { x: 32 },
};

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger reveals by passing an incremental delay (ms) — kept for back-compat. */
  delay?: number;
  variant?: Variant;
  style?: CSSProperties;
};

/**
 * Scroll-triggered entrance, powered by Framer Motion's `whileInView`.
 * Same props as the old IntersectionObserver version so every call site keeps
 * working; honours `prefers-reduced-motion` by rendering the plain element.
 */
export function Reveal({
  children,
  as = 'div',
  className = '',
  delay = 0,
  variant = 'rise',
  style,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  // motion exposes a motion-component per intrinsic tag (motion.div, motion.li, …).
  const Comp = (motion as unknown as Record<string, ElementType>)[as as string] ?? motion.div;
  const off = OFFSETS[variant];

  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, x: off.x ?? 0, y: off.y ?? 0, scale: off.scale ?? 1 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}
