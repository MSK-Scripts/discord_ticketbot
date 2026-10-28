import { useEffect, useState } from 'react';
import { Star } from '@/components/icons.jsx';
import { api } from '../api.js';
import { Banner, Empty, PageHeader, SectionCard, StatGrid, StatTile, fmtDuration } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';

export default function Stats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const t = useT();

  useEffect(() => {
    api.stats().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <><PageHeader title={t('stats.title')} /><Banner type="error">{error}</Banner></>;
  if (!data) return <Empty loading>{t('common.loading')}</Empty>;

  const avg = data.avgRating != null ? Number(data.avgRating).toFixed(2) : null;

  return (
    <>
      <PageHeader title={t('stats.title')} />

      <StatGrid className="mb-[var(--app-gutter-y)]">
        <StatTile value={data.total} label={t('stats.total')} />
        <StatTile value={data.open} label={t('stats.open')} />
        <StatTile value={data.closed} label={t('stats.closed')} />
        <StatTile value={avg} icon={avg ? Star : undefined} label={t('stats.avgRating')} />
        <StatTile value={fmtDuration(data.avgDuration)} label={t('stats.avgHandlingTime')} hint={t('stats.avgHandlingTimeHint')} />
      </StatGrid>

      <SectionCard title={t('stats.teamTitle')} description={t('stats.teamHint')}>
        {!data.topStaff?.length ? <Empty>{t('stats.noClosed')}</Empty> : (
          <Table caption={t('stats.teamTitle')}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('stats.rank')}</TableHead>
                <TableHead>{t('stats.staff')}</TableHead>
                <TableHead className="text-right">{t('stats.ticketsClosed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topStaff.map((s, i) => (
                <TableRow key={s.closed_by ?? i}>
                  <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell><UserName id={s.closed_by} /></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.count ?? s.closed ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}
