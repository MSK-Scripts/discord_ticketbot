import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

// A message inside a page, the shop's Notice: a bar in the tone colour, the
// sign in the tone colour, the text in the normal text colour so it reads at
// full contrast. Never colour alone: the sign and the bar carry the tone too.
const alertVariants = cva(
  'relative flex w-full items-start gap-3 rounded-md border-l-4 bg-muted px-4 py-3 text-small text-foreground [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        info: 'border-info [&>svg]:text-info',
        danger: 'border-danger [&>svg]:text-danger',
        success: 'border-success [&>svg]:text-success',
        warning: 'border-warning [&>svg]:text-warning',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      // Block flow, so inline text and <strong> read as one sentence.
      className={cn('min-w-0 flex-1 [&_p]:max-w-[65ch] [&_p:not(:first-child)]:mt-1', className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, alertVariants };
