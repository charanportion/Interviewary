import type { Rating } from '@interview-copilot/shared';

export interface RatingMeta {
  label: string;
  // Tailwind text + background utilities backed by the rating tokens in index.css.
  text: string;
  bg: string;
  dot: string;
  // 1–4, used for the strength meter.
  level: number;
}

export const RATING_META: Record<Rating, RatingMeta> = {
  weak: {
    label: 'Weak',
    text: 'text-[var(--color-weak)]',
    bg: 'bg-[var(--color-weak-bg)]',
    dot: 'bg-[var(--color-weak)]',
    level: 1,
  },
  adequate: {
    label: 'Adequate',
    text: 'text-[var(--color-adequate)]',
    bg: 'bg-[var(--color-adequate-bg)]',
    dot: 'bg-[var(--color-adequate)]',
    level: 2,
  },
  strong: {
    label: 'Strong',
    text: 'text-[var(--color-strong)]',
    bg: 'bg-[var(--color-strong-bg)]',
    dot: 'bg-[var(--color-strong)]',
    level: 3,
  },
  exceptional: {
    label: 'Exceptional',
    text: 'text-[var(--color-exceptional)]',
    bg: 'bg-[var(--color-exceptional-bg)]',
    dot: 'bg-[var(--color-exceptional)]',
    level: 4,
  },
};

export function ratingMeta(rating: Rating): RatingMeta {
  return RATING_META[rating];
}
