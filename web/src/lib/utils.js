import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
