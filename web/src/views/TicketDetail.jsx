import { useEffect, useState } from 'react';
import { ArrowLeftIcon, SendIcon, DownloadIcon, ExternalLinkIcon, LockIcon, UnlockIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner, Status, Priority, Empty, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select.jsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog.jsx';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/** Turn Discord's raw mention syntax into readable names. */
function renderContent(msg, roleNames) {
  const text = msg.content ?? '';
  const users = new Map((msg.mentions ?? []).map(u => [u.id, u.name]));
  return text
    .replace(/<@!?(\d+)>/g, (_, id) => `@${users.get(id) ?? 'user'}`)
    .replace(/<@&(\d+)>/g, (_, id) => `@${roleNames?.get(id) ?? 'role'}`)
    .replace(/<#(\d+)>/g, () => '#channel');
}

const Row = ({ label, children }) => (
  <div className="flex gap-3 border-b py-2 last:border-0">
    <div className="text-muted-foreground w-28 shrink-0 text-sm">{label}</div>
    <div className="min-w-0 flex-1 text-sm">{children}</div>
  </div>
);

/**
 * One ticket: metadata, the conversation, and the actions the viewer is allowed
 * to take. The conversation is fetched LIVE from Discord for open tickets (the
 * bot stores no message content); for closed ones the stored HTML transcript is
 * offered as a download.
 */
export default function TicketDetail({ id, me, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [convo, setConvo] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [roleNames, setRoleNames] = useState(null);
  const t = useT();

  const can = (p) => me.isOwner || me.permissions.includes(p);

  const load = () => {
    api.ticket(id).then(setData).catch(e => setError(e.message));
    api.messages(id).then(setConvo).catch(() => setConvo(null));
  };

  useEffect(load, [id]);

  // Role names, so "<@&123…>" can be shown as "@Team". Requires a permission an
  // end user does not have — failing is fine, the mention just stays generic.
  useEffect(() => {
    api.lookups().then(l => setRoleNames(new Map(l.roles.map(r => [r.id, r.name])))).catch(() => setRoleNames(null));
  }, []);

  // The ticket can change underneath us — someone closes it in Discord while this
  // view is open. Without this the page keeps offering Close/Reply on a ticket
  // that is already gone, and every action then fails for no visible reason.
  useEffect(() => {
    const poll = setInterval(load, 10_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(poll); window.removeEventListener('focus', onFocus); };
  }, [id]);

  const act = async (action, body) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.ticketAction(id, action, body);
      setNotice(t('ticket.actionDone', { action: t(`ticket.${action}`) }));
      setClosing(false);
      setCloseReason('');
      load();
      onChanged?.();
    } catch (e) {
      // Surface EVERYTHING. A silent failure here is the worst outcome.
      setError(e.detail ? `${e.message}: ${e.detail}` : e.message);
      // eslint-disable-next-line no-console
      console.error(`[dashboard] ticket action "${action}" failed`, e);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.reply(id, reply);
      setReply('');
      // Reload the ticket too (message_count changed) and tell the parent list.
      load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  /** Closed tickets have no live channel — download the stored HTML transcript.
   *  Deliberately a download, not inline render: the transcript is self-contained
   *  HTML built from user messages, so injecting it into the dashboard DOM would
   *  be an XSS sink. */
  const downloadTranscript = () => {
    if (!convo?.transcript) return;
    const url = URL.createObjectURL(new Blob([convo.transcript], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${id}-transcript.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (error && !data) {
    return <><Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon /> {t('common.back')}</Button><Banner type="error">{error}</Banner></>;
  }
  if (!data) return <Empty>{t('common.loading')}</Empty>;

  const ticket = data.ticket;
  const isOpen = ticket.status === 'open';
  const canReply = isOpen && !ticket.locked && (can('tickets.reply') || data.isMine);
  const canAct = can('tickets.act');

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon /> {t('common.back')}</Button>
          <h1 className="font-display text-xl font-bold">{t('ticket.heading', { id: ticket.id })}</h1>
          <Status status={ticket.status} />
          {!!ticket.locked && <Badge variant="muted">{t('ticket.locked')}</Badge>}
        </div>
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {isOpen ? (
              <>
                {ticket.claimed_by
                  ? <Button variant="outline" size="sm" disabled={busy} onClick={() => act('unclaim')}>{t('ticket.unclaim')}</Button>
                  : <Button variant="outline" size="sm" disabled={busy} onClick={() => act('claim')}>{t('ticket.claim')}</Button>}
                <Button variant="outline" size="sm" disabled={busy} onClick={() => act('lock', { locked: !ticket.locked })}>
                  {ticket.locked ? <><UnlockIcon /> {t('ticket.unlock')}</> : <><LockIcon /> {t('ticket.lock')}</>}
                </Button>
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => setClosing(true)}>{t('ticket.close')}</Button>
              </>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => act('reopen')}>{t('ticket.reopen')}</Button>
            )}
          </div>
        )}
      </div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      {/* Close confirmation as a real modal — no window.prompt(), which a browser
          can suppress, leaving the click silently doing nothing. */}
      <Dialog open={closing} onOpenChange={o => { if (!o) { setClosing(false); setCloseReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ticket.closeDialogTitle')}</DialogTitle>
            <DialogDescription>{t('ticket.closeDialogHint')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="close-reason">{t('ticket.closeReasonLabel')}</Label>
            <Input id="close-reason" autoFocus value={closeReason} placeholder={t('ticket.closeReasonPlaceholder')}
              onChange={e => setCloseReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') act('close', { reason: closeReason || null }); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => { setClosing(false); setCloseReason(''); }}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={busy} onClick={() => act('close', { reason: closeReason || null })}>
              {busy ? t('ticket.closing') : t('ticket.closeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ticket.detailsTitle')}</CardTitle>
            <CardDescription>{t('ticket.detailsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Row label={t('ticket.fieldType')}>{ticket.type}</Row>
              <Row label={t('ticket.fieldCreator')}><UserName id={ticket.creator_id} /></Row>
              <Row label={t('ticket.fieldPriority')}>
                {canAct && isOpen ? (
                  <Select value={ticket.priority || 'medium'} onValueChange={v => act('priority', { priority: v })}>
                    <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Priority value={ticket.priority} />}
              </Row>
              <Row label={t('ticket.fieldClaimedBy')}><UserName id={ticket.claimed_by} /></Row>
              <Row label={t('ticket.fieldCreated')}>{fmtDate(ticket.created_at)}</Row>
              <Row label={t('ticket.fieldMessages')}>{ticket.message_count}</Row>
              {!isOpen && <>
                <Row label={t('ticket.fieldClosedBy')}><UserName id={ticket.closed_by} /></Row>
                <Row label={t('ticket.fieldClosedAt')}>{fmtDate(ticket.closed_at)}</Row>
                <Row label={t('ticket.fieldReason')}>{ticket.close_reason || '—'}</Row>
              </>}
            </div>

            {data.rating && (
              <div className="mt-5">
                <h3 className="mb-1.5 text-sm font-semibold">{t('ticket.ratingTitle')}</h3>
                <p className="text-sm">
                  <span className="text-prio-medium">{'★'.repeat(data.rating.rating)}</span>
                  <span className="text-muted-foreground">{'☆'.repeat(5 - data.rating.rating)}</span>
                  {data.rating.comment && <span className="text-muted-foreground"> — {data.rating.comment}</span>}
                </p>
              </div>
            )}

            {data.notes?.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-1.5 text-sm font-semibold">{t('ticket.notesTitle')}</h3>
                {data.notes.map(n => (
                  <p key={n.id} className="mb-1.5 text-[13px]"><UserName id={n.author_id} />: {n.content}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ticket.conversationTitle')}</CardTitle>
            <CardDescription>
              {convo?.closed ? t('ticket.conversationStored') : t('ticket.conversationLive')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {convo?.closed && convo.transcript && (
              <div className="flex flex-col items-start gap-3">
                <p className="text-muted-foreground text-sm">{t('ticket.transcriptSaved')}</p>
                <div className="flex flex-wrap gap-2">
                  {convo.transcriptUrl && (
                    <Button size="sm" asChild>
                      <a href={convo.transcriptUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLinkIcon /> {t('ticket.openTranscript')}
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={downloadTranscript}><DownloadIcon /> {t('ticket.downloadTranscript')}</Button>
                </div>
              </div>
            )}
            {convo?.closed && !convo.transcript && (
              <p className="text-muted-foreground text-sm">{t('ticket.noTranscript')}</p>
            )}

            {!convo?.closed && (
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {convo?.messages?.length ? convo.messages.map(m => (
                  <div className="flex gap-2.5 border-b py-2 last:border-0" key={m.id}>
                    {m.author.avatar
                      ? <img className="size-8 shrink-0 rounded-full bg-white/8" src={m.author.avatar} alt="" />
                      : <div className="size-8 shrink-0 rounded-full bg-white/8" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-semibold">{m.author.name}</span>
                        {(m.author.bot || m.webhookId) && <Badge variant="secondary" className="px-1 py-0 text-[9px]">{t('ticket.appBadge')}</Badge>}
                        <span className="text-muted-foreground text-[11px]">{fmtDate(Date.parse(m.timestamp))}</span>
                      </div>
                      <div className="text-[13.5px] break-words whitespace-pre-wrap">
                        {m.content ? renderContent(m, roleNames) : <span className="text-muted-foreground">{t('ticket.noTextContent')}</span>}
                      </div>
                      {m.attachments?.map(a => (
                        <div key={a.url} className="text-xs">
                          <a className="text-primary" href={a.url} target="_blank" rel="noreferrer">📎 {a.name}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <Empty>{t('ticket.noMessages')}</Empty>}
              </div>
            )}

            {canReply && (
              <div className="mt-4">
                <Textarea
                  rows={3}
                  maxLength={2000}
                  placeholder={data.isMine && !can('tickets.reply')
                    ? t('ticket.replyAsSelf')
                    : t('ticket.replyAsBot')}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">{reply.length}/2000</span>
                  <Button size="sm" disabled={busy || !reply.trim()} onClick={send}><SendIcon /> {t('ticket.send')}</Button>
                </div>
              </div>
            )}
            {/* !! is load-bearing: `locked` is 0/1, and `cond && 0` renders a literal "0". */}
            {isOpen && !!ticket.locked && (
              <p className="text-muted-foreground mt-2.5 text-xs">{t('ticket.lockedHint')}</p>
            )}
            {!isOpen && <p className="text-muted-foreground mt-2.5 text-xs">{t('ticket.closedHint')}</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
