import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils.js';
import { handBackFocus, placePanel, rememberFocus } from '@/lib/layers.js';

/**
 * A panel on the native popover (`popover="auto"`), for the menus of the top
 * bar, as the shop's RowMenu does it.
 *
 * It opens in the top layer, so no container can clip it, and the browser
 * closes it on Escape and on a click outside. No script injects styles, the
 * CSP stays untouched. The panel sits below its button, or above it where the
 * window ends, and closes when the page scrolls or the window resizes, so it
 * never floats away from the button.
 *
 * The content is plain buttons and fields, not an ARIA menu: Tab reaches it
 * right after the button that opened it. The button reports its state with
 * aria-expanded, and focus goes back to it when the panel closes.
 *
 * `children` may be a function; it gets `close` to hide the panel after a
 * choice.
 */
export function Popover({ label, buttonLabel, buttonContent, buttonClassName, panelClassName, align = 'end', children }) {
  const id = useId();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button) return undefined;

    const hide = () => { if (panel.matches(':popover-open')) panel.hidePopover(); };
    const onScroll = (e) => { if (!panel.contains(e.target)) hide(); };
    const place = () => placePanel(panel, button.getBoundingClientRect(), { align });

    function onBefore(e) {
      if (e.newState !== 'open') return;
      rememberFocus(panel, document, button);
      panel.style.left = '';
      panel.style.right = '';
      place();
    }
    function onToggle(e) {
      const isOpen = e.newState === 'open';
      setOpen(isOpen);
      if (isOpen) {
        place();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', hide);
      } else {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', hide);
        handBackFocus(panel, document, button);
      }
    }

    panel.addEventListener('beforetoggle', onBefore);
    panel.addEventListener('toggle', onToggle);
    return () => {
      panel.removeEventListener('beforetoggle', onBefore);
      panel.removeEventListener('toggle', onToggle);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', hide);
    };
  }, [align]);

  const close = () => {
    const panel = panelRef.current;
    if (panel?.matches?.(':popover-open')) panel.hidePopover();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
        aria-label={buttonLabel}
        className={cn(
          'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md px-2 text-foreground transition-colors duration-150 hover:bg-muted aria-expanded:bg-muted',
          buttonClassName,
        )}
      >
        {buttonContent}
      </button>
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="group"
        aria-label={label}
        className={cn(
          'fixed inset-auto m-0 w-[min(20rem,calc(100vw-1rem))] rounded-lg border bg-card p-3 text-card-foreground shadow-card-hover',
          panelClassName,
        )}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </>
  );
}
