import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

// One main action per area in the accent (primary), the second one outlined,
// the third a text link. Red only where something is destroyed or closed.
// Focus uses the global 3 px outline from index.css.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-center leading-tight font-semibold transition-colors duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.15em]",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
        outline: 'border-[1.5px] border-input bg-transparent text-foreground hover:border-foreground',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        link: 'bg-transparent px-0 text-primary-text underline-offset-4 hover:underline',
        danger: 'bg-danger text-danger-foreground hover:brightness-95',
      },
      // Heights are minimums, so a long German label wraps instead of being
      // cut. md and lg reach 44 px; sm (36 px) is for dense rows and widens
      // its hit area to 44 px through tap-target.
      size: {
        sm: 'min-h-9 px-3.5 py-1.5 text-small tap-target',
        md: 'min-h-11 px-4 py-2 text-control',
        lg: 'min-h-12 px-6 py-2.5 text-lead',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

function Button({ className, variant, size, asChild = false, type, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      // A button inside a form must not submit it by accident.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
