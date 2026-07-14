import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils.js';

function Sheet(props) { return <SheetPrimitive.Root data-slot="sheet" {...props} />; }
function SheetTrigger(props) { return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />; }
function SheetClose(props) { return <SheetPrimitive.Close data-slot="sheet-close" {...props} />; }
function SheetPortal(props) { return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />; }

function SheetOverlay({ className, ...props }) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn('data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/70', className)}
      {...props}
    />
  );
}

function SheetContent({ className, children, side = 'left', ...props }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-sidebar data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-xs',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-xs',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:outline-none [&_svg]:size-4 cursor-pointer">
          <XIcon />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-foreground font-semibold', className)} {...props} />;
}

function SheetDescription({ className, ...props }) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
