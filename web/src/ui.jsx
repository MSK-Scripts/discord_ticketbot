/**
 * Shared presentational pieces of the views, after the shop's dashboard kit
 * (msk-shop components/dashboard): page head, section, status badge, stat
 * tile, notice and empty state. States always carry a word and a sign, never
 * colour alone (WCAG 1.4.1).
 */

import { useId } from 'react';
import {
  Archive, ArrowLeft, ChatCircle, CheckCircle, CircleNotch, Info, Minus, Warning, WarningCircle, X, XCircle,
} from '@/components/icons.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { cn } from '@/lib/utils.js';
import { useT, getLocale } from './i18n.jsx';

/** Placeholder for a value that is not there. An en dash, not an em dash. */
export const NONE = '–';

/* ── Page head ───────────────────────────────────────────────────────────── */

/**
 * Head of a view (shop PageHeader): the title, an optional status beside it,
 * a line below, at most one group of the page's own actions, and a way back.
 */
export function PageHeader({ title, description, badge, actions, back }) {
  return (
    <div className="mb-[var(--app-gutter-y)] grid gap-3 border-b pb-5">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-h1 font-bold tracking-[-0.01em]">{title}</h1>
            {badge}
          </div>
          {description && <div className="max-w-[65ch] text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/** A back link that routes inside the app and keeps a real href. */
export function BackLink({ href, onBack, children }) {
  return (
    <a
      href={href}
      onClick={e => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onBack();
      }}
      className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-primary-text hover:underline underline-offset-4"
    >
      <ArrowLeft className="size-4" />
      {children}
    </a>
  );
}

/**
 * A labelled section of a page with its own actions (shop SectionCard). A
 * region named by its heading, and a size container, so what is inside can
 * follow the section's width instead of the window's.
 */
export function SectionCard({ title, description, actions, children, className, bodyClassName }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('@container min-w-0 rounded-lg border bg-card text-card-foreground shadow-card', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-[var(--section-pad)] py-4">
        <div className="grid min-w-0 gap-1">
          <h2 id={id} className="font-display text-h3 font-[650]">{title}</h2>
          {description && <div className="max-w-[65ch] text-small text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className={cn('px-[var(--section-pad)] py-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

const TONE = {
  success: { className: 'text-success border-success bg-[color-mix(in_oklab,var(--success)_8%,transparent)]', icon: CheckCircle },
  warning: { className: 'text-warning border-warning bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]', icon: Warning },
  danger: { className: 'text-danger border-danger bg-[color-mix(in_oklab,var(--danger)_8%,transparent)]', icon: XCircle },
  info: { className: 'text-info border-info bg-[color-mix(in_oklab,var(--info)_8%,transparent)]', icon: Info },
  neutral: { className: 'text-muted-foreground border-input bg-transparent', icon: Minus },
};

/** The state of a thing (shop StatusBadge): word, sign and border in one tone. */
export function StatusBadge({ tone = 'neutral', icon, spin = false, children, className }) {
  const { className: toneClass, icon: ToneIcon } = TONE[tone] ?? TONE.neutral;
  const Icon = icon ?? ToneIcon;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-sm border-[1.5px] px-2 py-0.5 text-small leading-tight font-semibold whitespace-nowrap',
        toneClass,
        className,
      )}
    >
      <Icon className={cn('size-4 shrink-0', spin && 'animate-spin')} weight="bold" />
      {children}
    </span>
  );
}

export const Status = ({ status }) => {
  const t = useT();
  return status === 'open'
    ? <StatusBadge tone="success" icon={ChatCircle}>{t(`status.${status}`)}</StatusBadge>
    : <StatusBadge tone="neutral" icon={Archive}>{t(`status.${status}`)}</StatusBadge>;
};

// Priority: a sign and the word in one colour; low stays neutral, the colour
// rises with the urgency.
const PRIO_COLOR = {
  low: 'text-muted-foreground', medium: 'text-info', high: 'text-warning', urgent: 'text-danger',
};

export const Priority = ({ value }) => {
  const t = useT();
  const key = PRIO_COLOR[value] ? value : 'medium';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small font-semibold whitespace-nowrap', PRIO_COLOR[key])}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full bg-current', key === 'urgent' && 'ring-2 ring-current/30')} />
      {t(`priority.${key}`)}
    </span>
  );
};

/** Bot process states, same tones as the shop uses for a hosted bot. */
const BOT_TONE = {
  running: { tone: 'success' },
  stopped: { tone: 'neutral' },
  crashed: { tone: 'danger' },
  starting: { tone: 'warning', icon: CircleNotch, spin: true },
  stopping: { tone: 'warning', icon: CircleNotch, spin: true },
};

export function BotStatus({ status }) {
  const t = useT();
  const { tone, icon, spin } = BOT_TONE[status] ?? BOT_TONE.stopped;
  return <StatusBadge tone={tone} icon={icon} spin={spin}>{t(`bot.${status}`)}</StatusBadge>;
}

/* ── Figures ─────────────────────────────────────────────────────────────── */

/** One tile, one figure (shop StatTile). */
export function StatTile({ value, label, hint, icon: Icon }) {
  return (
    <div className="flex min-h-28 min-w-0 flex-col gap-1 rounded-lg border bg-card p-4 shadow-card">
      <span className="kicker text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-display text-figure font-bold tabular-nums">
        {value ?? NONE}
        {Icon && <Icon className="size-[0.8em] text-warning" weight="fill" />}
      </span>
      {hint && <span className="text-small text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Tiles gain columns with the room they have; none gets narrower than --grid-tile. */
export function StatGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(min(100%,var(--grid-tile)),1fr))] gap-3', className)}>
      {children}
    </div>
  );
}

/* ── Messages ────────────────────────────────────────────────────────────── */

const BANNER = {
  error: { variant: 'danger', icon: XCircle, role: 'alert' },
  success: { variant: 'success', icon: CheckCircle, role: 'status' },
  info: { variant: 'warning', icon: Warning, role: 'status' },
};

/**
 * The result of an action (shop Notice): tone bar and sign, the text in the
 * normal text colour. Errors interrupt (role alert), everything else is
 * announced politely.
 */
export function Banner({ type = 'info', children, onClose }) {
  const t = useT();
  if (!children) return null;
  const { variant, icon: Icon, role } = BANNER[type] ?? BANNER.info;
  return (
    <Alert variant={variant} role={role} className="mb-4">
      <Icon weight="bold" />
      <AlertDescription className="whitespace-pre-wrap">{children}</AlertDescription>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.dismiss')}
          className="tap-target -m-1 shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </Alert>
  );
}

/** A note inside a page that is not the result of an action. */
export function Note({ tone = 'info', children, className }) {
  const Icon = tone === 'warning' ? Warning : tone === 'danger' ? WarningCircle : Info;
  return (
    <Alert variant={tone} className={className}>
      <Icon weight="bold" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

/** Never a blank area: a short line where a list or a page has nothing to show. */
export const Empty = ({ children, loading = false }) => (
  <div role={loading ? 'status' : undefined} className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground">
    {loading && <CircleNotch className="size-6 animate-spin" />}
    <p className="max-w-[55ch]">{children}</p>
  </div>
);

/** A table cell link to a ticket: routes in the app, opens a new tab on a modified click. */
export function RowLink({ href, onOpen, children, className }) {
  return (
    <a
      href={href}
      onClick={e => {
        e.stopPropagation();
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onOpen();
      }}
      className={cn('tap-target inline-flex min-h-9 items-center rounded-sm font-mono font-semibold text-primary-text underline-offset-4 hover:underline', className)}
    >
      {children}
    </a>
  );
}

/** Opens the row's ticket on a click anywhere in the row, except on its own links and buttons. */
export const rowClick = (open) => (e) => {
  if (e.target.closest('a, button')) return;
  open();
};

/* ── Formatting ──────────────────────────────────────────────────────────── */

// Formatted in the language the user picked for the dashboard, not the browser's,
// so a German panel does not print English month names.
export const fmtDate = (ms) =>
  ms ? new Date(Number(ms)).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : NONE;

export function fmtDuration(ms) {
  if (!ms || ms < 0) return NONE;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
