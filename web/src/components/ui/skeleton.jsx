import { cn } from '@/lib/utils.js';

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn('bg-white/8 animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
