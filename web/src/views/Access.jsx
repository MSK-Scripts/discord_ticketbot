import { useEffect, useState, useCallback, useId } from 'react';
import { Check, CheckCircle, Minus } from '@/components/icons.jsx';
import { api } from '../api.js';
import { Banner, Empty, Note, PageHeader, SectionCard, StatusBadge, NONE, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx';

const EMPTY_FORM = { subjectType: 'role', subjectId: '', permissions: [], active: true };

/**
 * Permission management. The rule that matters: a USER entry OVERRIDES that
 * person's role entries completely, instead of adding to them. That is what makes
 * it possible to take a single permission AWAY from one staff member that their
 * role grants them. The server enforces the same rule; this screen only explains it.
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
  const typeId = useId();
  const subjectId = useId();
  const activeId = useId();
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

  if (!data) return <Empty loading>{t('common.loading')}</Empty>;

  return (
    <>
      <PageHeader title={t('access.title')} />

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <Note className="mb-[var(--app-gutter-y)]"><p>{t('access.overrideNotice')}</p></Note>

      <div className="grid gap-[var(--app-gutter-y)]">
        <SectionCard title={form.subjectId ? t('access.editTitle') : t('access.grantTitle')} description={t('access.grantHint')}>
          <div className="grid gap-5">
            <div className="grid gap-3 @xl:grid-cols-[minmax(10rem,14rem)_minmax(0,32rem)] @xl:items-end">
              <div className="grid gap-1.5">
                <Label htmlFor={typeId}>{t('access.type')}</Label>
                <Select value={form.subjectType} onValueChange={v => setForm(f => ({ ...f, subjectType: v, subjectId: '' }))}>
                  <SelectTrigger id={typeId}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="role">{t('access.role')}</SelectItem><SelectItem value="user">{t('access.user')}</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor={subjectId}>{form.subjectType === 'role' ? t('access.role') : t('access.userId')}</Label>
                {form.subjectType === 'role' && lookups?.roles?.length ? (
                  <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))}>
                    <SelectTrigger id={subjectId}><SelectValue placeholder={t('access.selectRole')} /></SelectTrigger>
                    <SelectContent>{lookups.roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input id={subjectId} className="font-mono" inputMode="numeric" placeholder={t('access.discordIdPlaceholder')} value={form.subjectId}
                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value.trim() }))} />
                )}
              </div>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-small font-semibold">{t('access.permissionsLabel')}</legend>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2">
                {data.permissions.map(p => {
                  const on = form.permissions.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => toggle(p)} aria-pressed={on}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border-[1.5px] px-3 py-2 text-left text-small transition-colors duration-150',
                        on ? 'border-primary-text bg-accent-soft font-semibold text-foreground' : 'border-input text-foreground hover:border-foreground',
                      )}>
                      <span aria-hidden="true" className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-sm border-[1.5px]',
                        on ? 'border-primary-text bg-primary text-primary-foreground' : 'border-input',
                      )}>
                        {on && <Check className="size-3.5" weight="bold" />}
                      </span>
                      {permLabel(p)}
                    </button>
                  );
                })}
              </div>
              <p className="max-w-[65ch] text-small text-muted-foreground">{t('access.configScopeNote')}</p>
            </fieldset>

            <div className="flex items-start gap-3">
              <Switch id={activeId} checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} className="mt-0.5" />
              <Label htmlFor={activeId} className="cursor-pointer font-normal">{t('access.activeToggle')}</Label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={busy || !form.subjectId || form.permissions.length === 0} onClick={submit}>
                {busy ? t('common.saving') : t('common.save')}
              </Button>
              {form.subjectId && <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}>{t('common.cancel')}</Button>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('access.whoTitle')} description={t('access.whoHint')}>
          {!data.entries.length ? <Empty>{t('access.whoEmpty')}</Empty> : (
            <Table caption={t('access.whoTitle')}>
              <TableHeader>
                <TableRow><TableHead>{t('access.type')}</TableHead><TableHead>{t('access.colSubject')}</TableHead><TableHead>{t('access.permissionsLabel')}</TableHead><TableHead>{t('access.colActive')}</TableHead><TableHead><span className="sr-only">{t('common.edit')}</span></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map(e => (
                  <TableRow key={`${e.subjectType}:${e.subjectId}`}>
                    <TableCell><Badge variant={e.subjectType === 'user' ? 'accent' : 'neutral'}>{t(`access.${e.subjectType}`)}</Badge></TableCell>
                    <TableCell className="min-w-40">
                      {e.subjectType === 'role'
                        ? (roleName(e.subjectId) ?? <span className="font-mono text-small">{e.subjectId}</span>)
                        : <UserName id={e.subjectId} />}
                      {e.subjectId === me.user.id && <span className="text-muted-foreground"> {t('access.you')}</span>}
                    </TableCell>
                    <TableCell className="min-w-56 max-w-[40ch] text-muted-foreground">
                      {e.permissions.map(permLabel).join(', ') || NONE}
                    </TableCell>
                    <TableCell>
                      {e.active
                        ? <StatusBadge tone="success" icon={CheckCircle}>{t('access.colActive')}</StatusBadge>
                        : <StatusBadge tone="neutral" icon={Minus}>{t('common.off')}</StatusBadge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => edit(e)}>{t('common.edit')}</Button>
                        {confirmKey === `${e.subjectType}:${e.subjectId}` ? (
                          <>
                            <Button variant="danger" size="sm" onClick={() => remove(e)}>{t('common.confirm')}</Button>
                            <Button variant="outline" size="sm" onClick={() => setConfirmKey(null)}>{t('common.cancel')}</Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="text-danger" onClick={() => remove(e)}>{t('common.remove')}</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard title={t('access.auditTitle')} description={t('access.auditHint')}>
          {!audit.length ? <Empty>{t('access.auditEmpty')}</Empty> : (
            <Table caption={t('access.auditTitle')}>
              <TableHeader>
                <TableRow><TableHead>{t('access.auditWhen')}</TableHead><TableHead>{t('access.auditWho')}</TableHead><TableHead>{t('access.auditAction')}</TableHead><TableHead>{t('access.auditTarget')}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {audit.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(a.created_at)}</TableCell>
                    <TableCell><UserName id={a.actor_id} /></TableCell>
                    <TableCell><span className="font-mono text-small">{a.action}</span></TableCell>
                    <TableCell className="font-mono text-small text-muted-foreground">{a.target || NONE}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}
