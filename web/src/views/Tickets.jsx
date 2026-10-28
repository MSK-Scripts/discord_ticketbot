import { useEffect, useState, useCallback, useId } from 'react';
import { ArrowsClockwise, CaretLeft, CaretRight } from '@/components/icons.jsx';
import { api } from '../api.js';
import { viewPath } from '../router.js';
import { Banner, Status, Priority, Empty, PageHeader, RowLink, rowClick, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select.jsx';
import TicketDetail from './TicketDetail.jsx';

const PAGE = 25;

// The open ticket is driven by the URL (/tickets/:id) via `ticketId`, so a reload
// or a shared link lands on the same ticket. onOpen/onClose change that URL.
export default function Tickets({ me, ticketId, onOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ status: 'open', priority: '', type: '' });
  const [typeInput, setTypeInput] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const statusId = useId();
  const priorityId = useId();
  const typeId = useId();
  const t = useT();

  // Debounce the free-text type filter so typing a codeName fires one request,
  // not one per keystroke.
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(0);
      setFilters(f => (f.type === typeInput ? f : { ...f, type: typeInput }));
    }, 350);
    return () => clearTimeout(h);
  }, [typeInput]);

  const load = useCallback(() => {
    setLoading(true);
    api.tickets({ ...filters, limit: PAGE, offset: page * PAGE })
      .then(({ items, total }) => { setItems(items); setTotal(total); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(load, [load]);

  if (ticketId) {
    return <TicketDetail id={ticketId} me={me} onBack={onClose} backHref={viewPath('tickets')} onChanged={load} />;
  }

  const pages = Math.ceil(total / PAGE);
  // Select has no empty-string value, so map "" ⇄ "all".
  const setFilter = (key) => (v) => { setPage(0); setFilters(f => ({ ...f, [key]: v === 'all' ? '' : v })); };

  return (
    <>
      <PageHeader
        title={t('tickets.title')}
        description={t('tickets.totalCount', { count: total })}
        actions={<Button variant="outline" onClick={load}><ArrowsClockwise /> {t('common.refresh')}</Button>}
      />

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>

      {/* Filters: labelled fields, side by side once the column has room. */}
      <div className="mb-4 grid gap-3 @xl:flex @xl:flex-wrap @xl:items-end">
        <div className="grid gap-1.5 @xl:w-52">
          <Label htmlFor={statusId}>{t('tickets.colStatus')}</Label>
          <Select value={filters.status || 'all'} onValueChange={setFilter('status')}>
            <SelectTrigger id={statusId}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tickets.allStatuses')}</SelectItem>
              <SelectItem value="open">{t('tickets.statusOpen')}</SelectItem>
              <SelectItem value="closed">{t('tickets.statusClosed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5 @xl:w-52">
          <Label htmlFor={priorityId}>{t('tickets.colPriority')}</Label>
          <Select value={filters.priority || 'all'} onValueChange={setFilter('priority')}>
            <SelectTrigger id={priorityId}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tickets.allPriorities')}</SelectItem>
              {['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5 @xl:w-64">
          <Label htmlFor={typeId}>{t('tickets.colType')}</Label>
          <Input id={typeId} placeholder={t('tickets.typeFilter')} value={typeInput} onChange={e => setTypeInput(e.target.value)} />
        </div>
      </div>

      {loading ? <Empty loading>{t('common.loading')}</Empty> : items.length === 0 ? (
        <div className="rounded-lg border bg-card"><Empty>{t('tickets.noMatch')}</Empty></div>
      ) : (
        <Table caption={t('tickets.title')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tickets.colId')}</TableHead><TableHead>{t('tickets.colType')}</TableHead><TableHead>{t('tickets.colStatus')}</TableHead><TableHead>{t('tickets.colPriority')}</TableHead>
              <TableHead>{t('tickets.colCreator')}</TableHead><TableHead>{t('tickets.colClaimedBy')}</TableHead><TableHead>{t('tickets.colCreated')}</TableHead><TableHead className="text-right">{t('tickets.colMessages')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.id} className="cursor-pointer" onClick={rowClick(() => onOpen(t.id))}>
                <TableCell><RowLink href={viewPath('tickets', t.id)} onOpen={() => onOpen(t.id)}>{t.id}</RowLink></TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell><Status status={t.status} /></TableCell>
                <TableCell><Priority value={t.priority} /></TableCell>
                <TableCell><UserName id={t.creator_id} /></TableCell>
                <TableCell><UserName id={t.claimed_by} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.message_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label={t('tickets.prevPage')}>
            <CaretLeft />
          </Button>
          <span className="text-small text-muted-foreground tabular-nums">{t('tickets.page', { page: page + 1, pages })}</span>
          <Button variant="outline" size="icon" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)} aria-label={t('tickets.nextPage')}>
            <CaretRight />
          </Button>
        </div>
      )}
    </>
  );
}
