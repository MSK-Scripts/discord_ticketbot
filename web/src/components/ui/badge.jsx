import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

// A tag (a category, "app", "you"), not a state: states are StatusBadge in
// ui.jsx, with a word and a sign. Square corners, never a pill.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-label font-semibold leading-tight whitespace-nowrap [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        accent: 'bg-accent-soft text-primary-text',
        neutral: 'border border-input text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'accent' },
  },
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
