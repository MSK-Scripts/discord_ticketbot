import { cn } from '@/lib/utils.js';

// The look shared by every text field: 16 px text or more (no zoom on iOS),
// a 1.5 px border that reaches 3:1, a red border once aria-invalid.
export const fieldClassName = cn(
  'w-full min-w-0 rounded-md border-[1.5px] border-input bg-card px-3 py-2 text-control text-foreground transition-colors duration-150',
  'placeholder:text-muted-foreground hover:border-foreground',
  'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50 read-only:hover:border-input',
);

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClassName,
        'flex min-h-11',
        'file:mr-3 file:inline-flex file:min-h-8 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:font-semibold file:text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
