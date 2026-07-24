/** Small shared presentational bits, built on the shadcn primitives. */

import { XIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';
import { useT, getLocale } from './i18n.jsx';

const BANNER_VARIANT = { error: 'destructive', success: 'success', info: 'warning' };

export function Banner({ type = 'info', children, onClose }) {
  const t = useT();
  if (!children) return null;
  return (
    <Alert variant={BANNER_VARIANT[type] ?? 'default'} className="mb-3">
      <AlertDescription className="flex items-center justify-between gap-2">
        <span className="whitespace-pre-wrap">{children}</span>
        {onClose && (
          <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer" aria-label={t('common.dismiss')}>
            <XIcon className="size-3.5" />
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export const Status = ({ status }) => {
  const t = useT();
  return (
    <Badge variant={status === 'open' ? 'success' : 'muted'} className="uppercase tracking-wide">
      {t(`status.${status}`)}
    </Badge>
  );
};

const PRIO_COLOR = {
  low: 'text-prio-low', medium: 'text-prio-medium', high: 'text-prio-high', urgent: 'text-prio-urgent',
};

export const Priority = ({ value }) => {
  const t = useT();
  const key = PRIO_COLOR[value] ? value : 'medium';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', PRIO_COLOR[key])}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(`priority.${key}`)}
    </span>
  );
};

export function Stat({ value, label }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-5">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value ?? '—'}</div>
        <div className="text-muted-foreground mt-1 text-xs font-semibold tracking-wide uppercase">{label}</div>
      </CardContent>
    </Card>
  );
}

export const Empty = ({ children }) => (
  <div className="text-muted-foreground px-6 py-9 text-center text-sm">{children}</div>
);

// Formatted in the language the user picked for the dashboard, not the browser's,
// so a German panel does not print English month names.
export const fmtDate = (ms) =>
  ms ? new Date(Number(ms)).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
