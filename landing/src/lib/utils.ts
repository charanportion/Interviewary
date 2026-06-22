import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conditional logic — the standard shadcn/Magic UI helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
