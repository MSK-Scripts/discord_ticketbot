/**
 * Focus handling for the native layers of the dashboard: the modal <dialog>
 * (confirmations, the navigation drawer) and the popover panels of the top
 * bar.
 *
 * The browser does most of the work: showModal() traps focus, Escape closes,
 * the page behind turns inert, and a popover closes on Escape and on a click
 * outside. Current browsers also hand focus back to the element that opened
 * the layer, but not in every case: when React re-rendered that element away,
 * when the layer was closed from code, or in an older engine. Then focus
 * lands on <body>, and a keyboard or screen reader user starts over at the
 * top of the page (WCAG 2.4.3). These helpers make the hand-back explicit:
 * remember where focus was when the layer opened, and return it on close if
 * it is lost or still inside the closed layer. If the person has already
 * moved focus somewhere else, it stays there.
 *
 * Pure DOM logic without React, so tests/dashboard-layers.test.js can run it
 * against small fakes in Node.
 */

const opener = new WeakMap();

/** Remember what should get focus back when `layer` closes. */
export function rememberFocus(layer, doc, target = doc?.activeElement) {
  if (!layer) return;
  if (target && target !== doc?.body) opener.set(layer, target);
  else opener.delete(layer);
}

/** Whether focus is gone: on nothing, on <body>, or inside the closed layer. */
export function focusIsLost(layer, doc) {
  const active = doc?.activeElement;
  if (!active || active === doc.body) return true;
  return Boolean(layer && typeof layer.contains === 'function' && layer.contains(active));
}

/**
 * Give focus back after `layer` closed. Returns the element that got focus,
 * or null when nothing had to be done.
 */
export function handBackFocus(layer, doc, fallback = null) {
  const target = opener.get(layer) ?? null;
  opener.delete(layer);
  if (!focusIsLost(layer, doc)) return null;
  for (const el of [target, fallback]) {
    if (el && el.isConnected !== false && typeof el.focus === 'function') {
      el.focus();
      return el;
    }
  }
  return null;
}

/**
 * Bring a native <dialog> in line with `open`: showModal() when it should be
 * open, close() when it should not. The opener is remembered first, because
 * showModal() moves focus into the dialog.
 */
export function syncModal(dialog, open, doc) {
  if (!dialog) return;
  if (open && !dialog.open) {
    rememberFocus(dialog, doc);
    dialog.showModal();
  } else if (!open && dialog.open) {
    dialog.close();
  }
}

/**
 * Place a popover panel below its trigger, aligned to the trigger's end (or
 * start), inside the window with an 8 px margin, and above the trigger when
 * there is no room below. Writes CSSOM properties, which the CSP does not
 * restrict, rather than a style attribute.
 */
export function placePanel(panel, rect, { align = 'end', gap = 6, margin = 8, win = window } = {}) {
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  if (!width) {
    // Not laid out yet (called before the panel shows): anchor by the edge,
    // which needs no size, so the first frame already sits at the trigger.
    panel.style.top = `${Math.round(rect.bottom + gap)}px`;
    if (align === 'end') {
      panel.style.left = 'auto';
      panel.style.right = `${Math.round(Math.max(margin, win.innerWidth - rect.right))}px`;
    } else {
      panel.style.right = 'auto';
      panel.style.left = `${Math.round(Math.max(margin, rect.left))}px`;
    }
    return;
  }
  panel.style.right = 'auto';
  let left = align === 'end' ? rect.right - width : rect.left;
  left = Math.min(Math.max(margin, left), Math.max(margin, win.innerWidth - width - margin));
  let top = rect.bottom + gap;
  if (top + height > win.innerHeight - margin && rect.top - gap - height > margin) {
    top = rect.top - gap - height;
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}
