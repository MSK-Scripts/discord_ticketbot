import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Banner, Stat, Empty, fmtDuration } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';

export default function Stats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <Banner type="error">{error}</Banner>;
  if (!data) return <Empty>Loading…</Empty>;

  const avg = data.avgRating != null ? Number(data.avgRating).toFixed(2) : null;

  return (
    <>
      <div className="mb-5"><h1 className="font-display text-xl font-bold">Statistics</h1></div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={data.total}  label="Tickets total" />
        <Stat value={data.open}   label="Open" />
        <Stat value={data.closed} label="Closed" />
        <Stat value={avg ? `${avg} ★` : '—'} label="Average rating" />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Average handling time</CardTitle>
          <CardDescription>From opening a ticket to closing it.</CardDescription>
        </CardHeader>
        <CardContent><div className="text-3xl font-bold tracking-tight">{fmtDuration(data.avgDuration)}</div></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team performance</CardTitle>
          <CardDescription>Staff members ranked by tickets closed.</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.topStaff?.length ? <Empty>No closed tickets yet.</Empty> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>#</TableHead><TableHead>Staff</TableHead><TableHead>Tickets closed</TableHead></TableRow>
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
