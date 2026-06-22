'use client';

import type { ElementType, ReactNode, CSSProperties } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

type CommonProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
};

/** Parent that cascades its `StaggerItem` children in as the group scrolls into view. */
export function Stagger({
  children,
  className,
  style,
  as = 'div',
  stagger = 0.08,
  delay = 0,
}: CommonProps & { stagger?: number; delay?: number }) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  const Comp = (motion as unknown as Record<string, ElementType>)[as as string] ?? motion.div;
  return (
    <Comp
      className={className}
      style={style}
      variants={containerVariants(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Comp>
  );
}

/** A single cascading child. Must be a direct child of `Stagger`. */
export function StaggerItem({ children, className, style, as = 'div' }: CommonProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  const Comp = (motion as unknown as Record<string, ElementType>)[as as string] ?? motion.div;
  return (
    <Comp className={className} style={style} variants={itemVariants}>
      {children}
    </Comp>
  );
}
