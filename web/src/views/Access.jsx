import { useEffect, useState, useCallback } from 'react';
import { InfoIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner, Empty, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx';

const EMPTY_FORM = { subjectType: 'role', subjectId: '', permissions: [], active: true };

/**
 * Permission management. The rule that matters: a USER entry OVERRIDES that
 * person's role entries completely, instead of adding to them. That is what makes
 * it possible to take a single permission AWAY from one staff member that their
 * role grants them. The server enforces the same rule — this screen only explains it.
 */
export default function Access({ me }) {
  const [data, setData] = useState(null);
  const [lookups, setLookups] = useState(null);
  const [audit, setAudit] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState(null);
  const t = useT();

  // Permission labels come from the dashboard's own translations so they follow the
  // language switcher. The server's label (English/German only) stays as a fallback
  // for a permission this build does not know a translation for yet.
  const permLabel = (p) => {
    const translated = t(`permissions.${p}`);
    return translated === `permissions.${p}` ? (data?.labels?.[p]?.en ?? p) : translated;
  };

  const load = useCallback(() => {
    api.access().then(setData).catch(e => setError(e.message));
    api.auditLog().then(({ entries }) => setAudit(entries)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.lookups().then(setLookups).catch(() => {});
  }, [load]);

  const roleName = (id) => lookups?.roles?.find(r => r.id === id)?.name ?? null;

  const toggle = (perm) => setForm(f => ({
    ...f,
    permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm],
  }));

  const submit = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.saveAccess(form);
      setNotice(t('access.savedNotice'));
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (entry) => setForm({
    subjectType: entry.subjectType, subjectId: entry.subjectId,
    permissions: [...entry.permissions], active: entry.active,
  });

  // Inline confirm instead of window.confirm(): a browser that suppresses dialogs
  // would make confirm() return false and the click silently do nothing.
  const remove = async (entry) => {
    const key = `${entry.subjectType}:${entry.subjectId}`;
    if (confirmKey !== key) { setConfirmKey(key); return; }
    setConfirmKey(null); setError(null);
    try {
      await api.deleteAccess(entry.subjectType, entry.subjectId);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!data) return <Empty>{t('common.loading')}</Empty>;

  return (
    <>
      <div className="mb-5"><h1 className="font-display text-xl font-bold">{t('access.title')}</h1></div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <Alert className="mb-4">
        <InfoIcon />
        <AlertDescription>{t('access.overrideNotice')}</AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{form.subjectId ? t('access.editTitle') : t('access.grantTitle')}</CardTitle>
          <CardDescription>{t('access.grantHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('access.type')}</Label>
              <Select value={form.subjectType} onValueChange={v => setForm(f => ({ ...f, subjectType: v, subjectId: '' }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="role">{t('access.role')}</SelectItem><SelectItem value="user">{t('access.user')}</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <Label>{form.subjectType === 'role' ? t('access.role') : t('access.userId')}</Label>
              {form.subjectType === 'role' && lookups?.roles?.length ? (
                <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('access.selectRole')} /></SelectTrigger>
                  <SelectContent>{lookups.roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input placeholder={t('access.discordIdPlaceholder')} value={form.subjectId}
                  onChange={e => setForm(f => ({ ...f, subjectId: e.target.value.trim() }))} />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('access.permissionsLabel')}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.permissions.map(p => {
                const on = form.permissions.includes(p);
                return (
                  <button key={p} type="button" onClick={() => toggle(p)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                      on ? 'border-primary/50 bg-primary/10 text-foreground' : 'hover:bg-accent text-muted-foreground',
                    )}>
                    <span className={cn('size-3.5 shrink-0 rounded-[4px] border', on ? 'bg-primary border-primary' : 'border-input')} />
                    {permLabel(p)}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">{t('access.configScopeNote')}</p>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            {t('access.activeToggle')}
          </label>

          <div className="flex gap-2">
            <Button disabled={busy || !form.subjectId || form.permissions.length === 0} onClick={submit}>
              {busy ? t('common.saving') : t('common.save')}
            </Button>
            {form.subjectId && <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}>{t('common.cancel')}</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('access.whoTitle')}</CardTitle>
          <CardDescription>{t('access.whoHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.entries.length ? <Empty>{t('access.whoEmpty')}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t('access.type')}</TableHead><TableHead>{t('access.colSubject')}</TableHead><TableHead>{t('access.permissionsLabel')}</TableHead><TableHead>{t('access.colActive')}</TableHead><TableHead /></TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map(e => (
                  <TableRow key={`${e.subjectType}:${e.subjectId}`}>
                    <TableCell><Badge variant={e.subjectType === 'user' ? 'success' : 'muted'}>{t(`access.${e.subjectType}`)}</Badge></TableCell>
                    <TableCell>
                      {e.subjectType === 'role'
                        ? (roleName(e.subjectId) ?? <span className="font-mono">{e.subjectId}</span>)
                        : <UserName id={e.subjectId} />}
                      {e.subjectId === me.user.id && <span className="text-muted-foreground"> {t('access.you')}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs whitespace-normal">
                      {e.permissions.map(permLabel).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{e.active ? '✓' : <span className="text-muted-foreground">{t('common.off')}</span>}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => edit(e)}>{t('common.edit')}</Button>
                        {confirmKey === `${e.subjectType}:${e.subjectId}` ? (
                          <>
                            <Button variant="destructive" size="sm" onClick={() => remove(e)}>{t('common.confirm')}</Button>
                            <Button variant="outline" size="sm" onClick={() => setConfirmKey(null)}>{t('common.cancel')}</Button>
                          </>
                        ) : (
                          <Button variant="destructive" size="sm" onClick={() => remove(e)}>{t('common.remove')}</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('access.auditTitle')}</CardTitle>
          <CardDescription>{t('access.auditHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!audit.length ? <Empty>{t('access.auditEmpty')}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t('access.auditWhen')}</TableHead><TableHead>{t('access.auditWho')}</TableHead><TableHead>{t('access.auditAction')}</TableHead><TableHead>{t('access.auditTarget')}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {audit.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(a.created_at)}</TableCell>
                    <TableCell><UserName id={a.actor_id} /></TableCell>
                    <TableCell><span className="font-mono text-xs">{a.action}</span></TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{a.target || '—'}</TableCell>
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
