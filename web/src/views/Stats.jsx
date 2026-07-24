import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Banner, Stat, Empty, fmtDuration } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';

export default function Stats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const t = useT();

  useEffect(() => {
    api.stats().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <Banner type="error">{error}</Banner>;
  if (!data) return <Empty>{t('common.loading')}</Empty>;

  const avg = data.avgRating != null ? Number(data.avgRating).toFixed(2) : null;

  return (
    <>
      <div className="mb-5"><h1 className="font-display text-xl font-bold">{t('stats.title')}</h1></div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={data.total}  label={t('stats.total')} />
        <Stat value={data.open}   label={t('stats.open')} />
        <Stat value={data.closed} label={t('stats.closed')} />
        <Stat value={avg ? `${avg} ★` : '—'} label={t('stats.avgRating')} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('stats.avgHandlingTime')}</CardTitle>
          <CardDescription>{t('stats.avgHandlingTimeHint')}</CardDescription>
        </CardHeader>
        <CardContent><div className="text-3xl font-bold tracking-tight">{fmtDuration(data.avgDuration)}</div></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('stats.teamTitle')}</CardTitle>
          <CardDescription>{t('stats.teamHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.topStaff?.length ? <Empty>{t('stats.noClosed')}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t('stats.rank')}</TableHead><TableHead>{t('stats.staff')}</TableHead><TableHead>{t('stats.ticketsClosed')}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.topStaff.map((s, i) => (
                  <TableRow key={s.closed_by ?? i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell><UserName id={s.closed_by} /></TableCell>
                    <TableCell><strong>{s.count ?? s.closed ?? 0}</strong></TableCell>
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
