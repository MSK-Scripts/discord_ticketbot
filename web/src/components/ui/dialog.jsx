import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils.js';
import { handBackFocus, syncModal } from '@/lib/layers.js';

/**
 * Modal dialog on the native <dialog> element, as in the shop
 * (msk-shop components/ui/Dialog.tsx).
 *
 * showModal() brings the focus trap, Escape to close, an inert page behind
 * and the top layer without a script of ours, and unlike a Radix dialog it
 * injects no <style> element at runtime. The title names the dialog and the
 * description describes it for a screen reader. Focus goes to the first
 * field or button when it opens and back to the opener when it closes
 * (lib/layers.js). A click on the backdrop closes it like Escape.
 *
 * Buttons go in as children: cancel first, the confirming one last, red only
 * when the action destroys or ends something.
 */
export function Dialog({ open, onClose, title, description, body, children, className }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    syncModal(ref.current, open, document);
  }, [open]);

  const handleClose = () => {
    handBackFocus(ref.current, document);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={e => { if (e.target === e.currentTarget) ref.current?.close(); }}
      className={cn(
        'm-auto w-[min(100%_-_2rem,32rem)] max-w-none rounded-lg border bg-card p-[var(--section-pad)] text-card-foreground shadow-card-hover',
        'open:animate-in open:fade-in-0',
        className,
      )}
    >
      <div className="grid gap-3">
        <h2 id={titleId} className="font-display text-h3 font-[650]">{title}</h2>
        {description && (
          <p id={descriptionId} className="max-w-[65ch] text-small text-muted-foreground">{description}</p>
        )}
        {body && <div className="mt-1">{body}</div>}
        {children && <div className="mt-2 flex flex-wrap justify-end gap-3">{children}</div>}
      </div>
    </dialog>
  );
}

/**
 * The navigation as a modal drawer at the inline start, below the sidebar
 * breakpoint (shop AppShell NavDrawer). Its content mounts only while it is
 * open. Same native behaviour as Dialog: focus trap, Escape, inert page,
 * focus back to the menu button.
 */
export function Drawer({ open, onClose, label, header, children }) {
  const ref = useRef(null);

  useEffect(() => {
    syncModal(ref.current, open, document);
  }, [open]);

  const handleClose = () => {
    handBackFocus(ref.current, document);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={handleClose}
      onClick={e => { if (e.target === e.currentTarget) ref.current?.close(); }}
      className={cn(
        // Full height at the inline start, at most 22rem and never wider than
        // the window minus a strip to tap out of it.
        'm-0 h-dvh max-h-none w-[min(22rem,calc(100vw-3rem))] max-w-none overflow-y-auto overscroll-contain',
        'border-r bg-card p-0 text-card-foreground',
        'open:animate-in open:slide-in-from-left-4 open:fade-in-0',
      )}
    >
      {open && (
        <div className="flex min-h-full flex-col">
          {header}
          {children}
        </div>
      )}
    </dialog>
  );
}
