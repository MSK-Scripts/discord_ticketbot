import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { Banner, Status, Priority, Empty, fmtDate } from '../ui.jsx';
import { useT } from '../i18n.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';
import TicketDetail from './TicketDetail.jsx';

/**
 * The end-user view: a member with ZERO dashboard permissions still sees the
 * tickets they created, and can reply to the open ones. Ownership is enforced
 * server-side against tickets.creator_id — never against anything the client says.
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
    return <TicketDetail id={ticketId} me={me} onBack={onClose} onChanged={load} />;
  }

  return (
    <>
      <div className="mb-5"><h1 className="font-display text-xl font-bold">{t('myTickets.title')}</h1></div>
      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>

      <Card>
        <CardHeader>
          <CardTitle>{t('myTickets.cardTitle')}</CardTitle>
          <CardDescription>{t('myTickets.cardHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!items ? <Empty>{t('common.loading')}</Empty> : items.length === 0 ? (
            <Empty>{t('myTickets.empty')}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t('tickets.colId')}</TableHead><TableHead>{t('tickets.colType')}</TableHead><TableHead>{t('tickets.colStatus')}</TableHead><TableHead>{t('tickets.colPriority')}</TableHead><TableHead>{t('tickets.colCreated')}</TableHead></TableRow>
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
                    <TableCell className="text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
