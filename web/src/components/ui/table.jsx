import { useId } from 'react';
import { cn } from '@/lib/utils.js';

/**
 * A table in its own scroll container (shop DataTable): a wide table scrolls
 * sideways inside the page instead of the page itself (WCAG 1.4.10). With a
 * caption the container is a labelled, focusable region, so a keyboard can
 * scroll it too; the caption stays for screen readers when it is hidden.
 */
function Table({ className, caption, captionHidden = true, children, ...props }) {
  const id = useId();
  return (
    <div
      data-slot="table-container"
      role={caption ? 'region' : undefined}
      aria-labelledby={caption ? id : undefined}
      tabIndex={caption ? 0 : undefined}
      className="relative w-full overflow-x-auto rounded-lg border bg-card"
    >
      <table data-slot="table" className={cn('w-full border-collapse text-small', className)} {...props}>
        {caption && (
          <caption id={id} className={cn('px-4 py-3 text-left font-semibold', captionHidden && 'sr-only')}>{caption}</caption>
        )}
        {children}
      </table>
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={cn('bg-muted', className)} {...props} />;
}

function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b transition-colors duration-150 last:border-b-0 [tbody_&]:hover:bg-muted/60', className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn('border-b px-3 py-2.5 text-left align-middle font-semibold whitespace-nowrap text-foreground', className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={cn('px-3 py-2.5 align-middle', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
