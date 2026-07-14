import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'text-destructive bg-destructive/10 border-destructive/30 [&>svg]:text-current',
        success: 'text-primary bg-primary/10 border-primary/30 [&>svg]:text-current',
        warning: 'text-warn bg-warn/10 border-warn/30 [&>svg]:text-current',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }) {
  return <div data-slot="alert-title" className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)} {...props} />;
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      // Block flow (not grid): inline text + <strong> must read as one sentence.
      // A grid container would wrap every text run and inline element into its own
      // cell and stack them vertically.
      className={cn('col-start-2 text-sm leading-relaxed [&_p:not(:first-child)]:mt-1', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
