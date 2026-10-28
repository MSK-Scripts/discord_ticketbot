import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The type scale of index.css (`--text-h1` to `--text-figure`).
 *
 * tailwind-merge only knows Tailwind's own sizes. Any other `text-*` it takes
 * for a colour, so `cn('text-danger-foreground', 'text-control')` dropped the
 * colour and every button showed the inherited text on its fill (near black
 * on red in the light theme). The shop hit the same on 28.10.2026 and fixed it
 * the same way. tests/dashboard-class-merge.test.js keeps this list in step
 * with index.css.
 */
export const FONT_SIZES = ['h1', 'h3', 'lead', 'body', 'small', 'label', 'control', 'figure'];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
    },
  },
});

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
