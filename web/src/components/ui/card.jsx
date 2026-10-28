import { cn } from '@/lib/utils.js';

// A surface for something that is a task of its own. Sections of a page use
// SectionCard from ui.jsx, which builds on the same look.
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn('flex flex-col gap-4 rounded-lg border bg-card py-[var(--section-pad)] text-card-foreground shadow-card', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn('grid gap-1 px-[var(--section-pad)]', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h2 data-slot="card-title" className={cn('font-display text-h3 font-[650]', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <div data-slot="card-description" className={cn('max-w-[65ch] text-small text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('px-[var(--section-pad)]', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
