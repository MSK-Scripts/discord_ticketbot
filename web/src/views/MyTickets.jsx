import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { viewPath } from '../router.js';
import { Banner, Status, Priority, Empty, PageHeader, RowLink, rowClick, fmtDate } from '../ui.jsx';
import { useT } from '../i18n.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';
import TicketDetail from './TicketDetail.jsx';

/**
 * The end-user view: a member with ZERO dashboard permissions still sees the
 * tickets they created, and can reply to the open ones. Ownership is enforced
 * server-side against tickets.creator_id, never against anything the client says.
 */
export default function MyTickets({ me, ticketId, onOpen, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const t = useT();

  const load = useCallback(() => {
    api.myTickets().then(({ items }) => setItems(items)).catch(e => setError(e.message));
  }, []);

  useEffect(load, [load]);

  if (ticketId) {
    return <TicketDetail id={ticketId} me={me} onBack={onClose} backHref={viewPath('mine')} onChanged={load} />;
  }

  return (
    <>
      <PageHeader title={t('myTickets.title')} description={t('myTickets.cardHint')} />
      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>

      {!items ? <Empty loading>{t('common.loading')}</Empty> : items.length === 0 ? (
        <div className="rounded-lg border bg-card"><Empty>{t('myTickets.empty')}</Empty></div>
      ) : (
        <Table caption={t('myTickets.cardTitle')} captionHidden={false}>
          <TableHeader>
            <TableRow><TableHead>{t('tickets.colId')}</TableHead><TableHead>{t('tickets.colType')}</TableHead><TableHead>{t('tickets.colStatus')}</TableHead><TableHead>{t('tickets.colPriority')}</TableHead><TableHead>{t('tickets.colCreated')}</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.id} className="cursor-pointer" onClick={rowClick(() => onOpen(t.id))}>
                <TableCell><RowLink href={viewPath('mine', t.id)} onOpen={() => onOpen(t.id)}>{t.id}</RowLink></TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell><Status status={t.status} /></TableCell>
                <TableCell><Priority value={t.priority} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
