import { useEffect, useState, useCallback } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner, Status, Priority, Empty, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
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
    return <TicketDetail id={ticketId} me={me} onBack={onClose} onChanged={load} />;
  }

  const pages = Math.ceil(total / PAGE);
  // Select has no empty-string value, so map "" ⇄ "all".
  const setFilter = (key) => (v) => { setPage(0); setFilters(f => ({ ...f, [key]: v === 'all' ? '' : v })); };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">{t('tickets.title')}</h1>
        <span className="text-muted-foreground text-sm">{t('tickets.totalCount', { count: total })}</span>
      </div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.status || 'all'} onValueChange={setFilter('status')}>
              <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tickets.allStatuses')}</SelectItem>
                <SelectItem value="open">{t('tickets.statusOpen')}</SelectItem>
                <SelectItem value="closed">{t('tickets.statusClosed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority || 'all'} onValueChange={setFilter('priority')}>
              <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tickets.allPriorities')}</SelectItem>
                {['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input className="h-8 w-44" placeholder={t('tickets.typeFilter')} value={typeInput} onChange={e => setTypeInput(e.target.value)} />

            <Button variant="outline" size="sm" onClick={load}><RefreshCwIcon /> {t('common.refresh')}</Button>
          </div>

          {loading ? <Empty>{t('common.loading')}</Empty> : items.length === 0 ? <Empty>{t('tickets.noMatch')}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tickets.colId')}</TableHead><TableHead>{t('tickets.colType')}</TableHead><TableHead>{t('tickets.colStatus')}</TableHead><TableHead>{t('tickets.colPriority')}</TableHead>
                  <TableHead>{t('tickets.colCreator')}</TableHead><TableHead>{t('tickets.colClaimedBy')}</TableHead><TableHead>{t('tickets.colCreated')}</TableHead><TableHead>{t('tickets.colMessages')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(t => (
                  <TableRow key={t.id} tabIndex={0} className="cursor-pointer"
                    onClick={() => onOpen(t.id)}
                    onKeyDown={e => { if (e.key === 'Enter') onOpen(t.id); }}>
                    <TableCell className="font-mono">{t.id}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell><Status status={t.status} /></TableCell>
                    <TableCell><Priority value={t.priority} /></TableCell>
                    <TableCell><UserName id={t.creator_id} /></TableCell>
                    <TableCell><UserName id={t.claimed_by} /></TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                    <TableCell>{t.message_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</Button>
              <span className="text-muted-foreground text-sm">{t('tickets.page', { page: page + 1, pages })}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>→</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
