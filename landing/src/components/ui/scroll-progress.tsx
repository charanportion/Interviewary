'use client';

import { motion, useScroll, type MotionProps } from 'motion/react';

import { cn } from '@/lib/utils';

interface ScrollProgressProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  ref?: React.Ref<HTMLDivElement>;
}

export function ScrollProgress({ className, ref, ...props }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      ref={ref}
      className={cn(
        'fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-linear-to-r from-[#1f4e79] via-[#4b3fb0] to-[#1d7a52]',
        className,
      )}
      style={{ scaleX: scrollYProgress }}
      {...props}
    />
  );
}
