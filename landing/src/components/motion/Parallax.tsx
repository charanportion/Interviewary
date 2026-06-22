'use client';

import type { ReactNode, CSSProperties } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Pixels the element drifts over the first ~700px of page scroll. */
  speed?: number;
};

/** Drifts its child on vertical scroll. No-ops under reduced motion. */
export function Parallax({ children, className, style, speed = 40 }: ParallaxProps) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, speed]);

  return (
    <motion.div className={className} style={reduce ? style : { ...style, y }}>
      {children}
    </motion.div>
  );
}
