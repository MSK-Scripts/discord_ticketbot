import { useEffect, useId, useState } from 'react';
import {
  ArrowSquareOut, DownloadSimple, Lock, LockOpen, PaperPlaneRight, Paperclip, Star,
} from '@/components/icons.jsx';
import { api } from '../api.js';
import { Banner, BackLink, Status, Priority, Empty, PageHeader, SectionCard, StatusBadge, NONE, fmtDate } from '../ui.jsx';
import { UserName } from '../users.jsx';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select.jsx';
import { Dialog } from '@/components/ui/dialog.jsx';

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

/** One fact of the ticket as a term and its value. */
const Row = ({ label, children }) => (
  <div className="grid gap-x-4 gap-y-0.5 border-b py-2.5 last:border-b-0 @md:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)] @md:items-center">
    <dt className="text-small text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

/** A round mark with the author's initial where Discord has no avatar. */
function Avatar({ src, name }) {
  if (src) return <img className="size-9 shrink-0 rounded-full bg-muted" src={src} alt="" />;
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
      {(name ?? '?').trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/**
 * One ticket: metadata, the conversation, and the actions the viewer is allowed
 * to take. The conversation is fetched LIVE from Discord for open tickets (the
 * bot stores no message content); for closed ones the stored HTML transcript is
 * offered as a download.
 */
export default function TicketDetail({ id, me, onBack, backHref, onChanged }) {
  const [data, setData] = useState(null);
  const [convo, setConvo] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [roleNames, setRoleNames] = useState(null);
  const replyId = useId();
  const countId = useId();
  const priorityId = useId();
  const t = useT();

  const can = (p) => me.isOwner || me.permissions.includes(p);

  const load = () => {
    api.ticket(id).then(setData).catch(e => setError(e.message));
    api.messages(id).then(setConvo).catch(() => setConvo(null));
  };

  useEffect(load, [id]);

  // Role names, so "<@&123…>" can be shown as "@Team". Requires a permission an
  // end user does not have; failing is fine, the mention just stays generic.
  useEffect(() => {
    api.lookups().then(l => setRoleNames(new Map(l.roles.map(r => [r.id, r.name])))).catch(() => setRoleNames(null));
  }, []);

  // The ticket can change underneath us: someone closes it in Discord while this
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

  /** Closed tickets have no live channel, so the stored HTML transcript is a
   *  download. Deliberately not rendered inline: the transcript is
   *  self-contained HTML built from user messages, so injecting it into the
   *  dashboard DOM would be an XSS sink. */
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

  const back = <BackLink href={backHref} onBack={onBack}>{t('common.back')}</BackLink>;

  if (error && !data) {
    return <><PageHeader title={t('ticket.heading', { id })} back={back} /><Banner type="error">{error}</Banner></>;
  }
  if (!data) return <Empty loading>{t('common.loading')}</Empty>;

  const ticket = data.ticket;
  const isOpen = ticket.status === 'open';
  const canReply = isOpen && !ticket.locked && (can('tickets.reply') || data.isMine);
  const canAct = can('tickets.act');

  return (
    <>
      <PageHeader
        back={back}
        title={t('ticket.heading', { id: ticket.id })}
        badge={(
          <>
            <Status status={ticket.status} />
            {!!ticket.locked && <StatusBadge tone="warning" icon={Lock}>{t('ticket.locked')}</StatusBadge>}
          </>
        )}
        actions={canAct && (isOpen ? (
          <>
            {ticket.claimed_by
              ? <Button variant="outline" disabled={busy} onClick={() => act('unclaim')}>{t('ticket.unclaim')}</Button>
              : <Button variant="outline" disabled={busy} onClick={() => act('claim')}>{t('ticket.claim')}</Button>}
            <Button variant="outline" disabled={busy} onClick={() => act('lock', { locked: !ticket.locked })}>
              {ticket.locked ? <><LockOpen /> {t('ticket.unlock')}</> : <><Lock /> {t('ticket.lock')}</>}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setClosing(true)}>{t('ticket.close')}</Button>
          </>
        ) : (
          <Button disabled={busy} onClick={() => act('reopen')}>{t('ticket.reopen')}</Button>
        ))}
      />

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      {/* Close confirmation as a real modal: no window.prompt(), which a browser
          can suppress, leaving the click silently doing nothing. */}
      <Dialog
        open={closing}
        onClose={() => { setClosing(false); setCloseReason(''); }}
        title={t('ticket.closeDialogTitle')}
        description={t('ticket.closeDialogHint')}
        body={(
          <div className="grid gap-1.5">
            <Label htmlFor="close-reason">{t('ticket.closeReasonLabel')}</Label>
            <Input id="close-reason" value={closeReason} placeholder={t('ticket.closeReasonPlaceholder')}
              onChange={e => setCloseReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') act('close', { reason: closeReason || null }); }} />
          </div>
        )}
      >
        <Button variant="outline" disabled={busy} onClick={() => { setClosing(false); setCloseReason(''); }}>{t('common.cancel')}</Button>
        <Button variant="danger" disabled={busy} onClick={() => act('close', { reason: closeReason || null })}>
          {busy ? t('ticket.closing') : t('ticket.closeConfirm')}
        </Button>
      </Dialog>

      <div className="grid items-start gap-[var(--app-gutter)] @5xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SectionCard title={t('ticket.detailsTitle')} description={t('ticket.detailsHint')}>
          <dl>
            <Row label={t('ticket.fieldType')}>{ticket.type}</Row>
            <Row label={t('ticket.fieldCreator')}><UserName id={ticket.creator_id} /></Row>
            <Row label={canAct && isOpen ? <label htmlFor={priorityId}>{t('ticket.fieldPriority')}</label> : t('ticket.fieldPriority')}>
              {canAct && isOpen ? (
                <Select value={ticket.priority || 'medium'} onValueChange={v => act('priority', { priority: v })}>
                  <SelectTrigger id={priorityId} className="w-full @md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}</SelectContent>
                </Select>
              ) : <Priority value={ticket.priority} />}
            </Row>
            <Row label={t('ticket.fieldClaimedBy')}><UserName id={ticket.claimed_by} /></Row>
            <Row label={t('ticket.fieldCreated')}>{fmtDate(ticket.created_at)}</Row>
            <Row label={t('ticket.fieldMessages')}><span className="tabular-nums">{ticket.message_count}</span></Row>
            {!isOpen && <>
              <Row label={t('ticket.fieldClosedBy')}><UserName id={ticket.closed_by} /></Row>
              <Row label={t('ticket.fieldClosedAt')}>{fmtDate(ticket.closed_at)}</Row>
              <Row label={t('ticket.fieldReason')}>{ticket.close_reason || NONE}</Row>
            </>}
          </dl>

          {data.rating && (
            <div className="mt-6 grid gap-1.5">
              <h3 className="kicker text-muted-foreground">{t('ticket.ratingTitle')}</h3>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex text-warning" role="img" aria-label={t('ticket.ratingValue', { rating: data.rating.rating })}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-5" weight={i < data.rating.rating ? 'fill' : 'regular'} />
                  ))}
                </span>
                {data.rating.comment && <span className="text-muted-foreground">{data.rating.comment}</span>}
              </p>
            </div>
          )}

          {data.notes?.length > 0 && (
            <div className="mt-6 grid gap-2">
              <h3 className="kicker text-muted-foreground">{t('ticket.notesTitle')}</h3>
              <ul className="grid gap-2">
                {data.notes.map(n => (
                  <li key={n.id} className="rounded-md bg-muted px-3 py-2 text-small">
                    <span className="font-semibold"><UserName id={n.author_id} /></span>
                    <p className="mt-0.5 max-w-[65ch] whitespace-pre-wrap">{n.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t('ticket.conversationTitle')}
          description={convo?.closed ? t('ticket.conversationStored') : t('ticket.conversationLive')}
        >
          {convo?.closed && convo.transcript && (
            <div className="grid justify-items-start gap-3">
              <p className="max-w-[65ch] text-muted-foreground">{t('ticket.transcriptSaved')}</p>
              <div className="flex flex-wrap gap-3">
                {convo.transcriptUrl && (
                  <Button asChild>
                    <a href={convo.transcriptUrl} target="_blank" rel="noopener noreferrer">
                      <ArrowSquareOut /> {t('ticket.openTranscript')}
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={downloadTranscript}><DownloadSimple /> {t('ticket.downloadTranscript')}</Button>
              </div>
            </div>
          )}
          {convo?.closed && !convo.transcript && (
            <p className="text-muted-foreground">{t('ticket.noTranscript')}</p>
          )}

          {!convo?.closed && (
            // A focusable region, so the conversation scrolls with the keyboard too.
            <div
              role="region"
              aria-label={t('ticket.conversationTitle')}
              tabIndex={0}
              className="-mx-2 max-h-[min(36rem,60dvh)] overflow-y-auto rounded-md px-2"
            >
              {convo?.messages?.length ? (
                <ol className="grid">
                  {convo.messages.map(m => (
                    <li className="flex gap-3 border-b py-3 last:border-b-0" key={m.id}>
                      <Avatar src={m.author.avatar} name={m.author.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-semibold">{m.author.name}</span>
                          {(m.author.bot || m.webhookId) && <Badge variant="neutral">{t('ticket.appBadge')}</Badge>}
                          <time className="text-label text-muted-foreground" dateTime={m.timestamp}>{fmtDate(Date.parse(m.timestamp))}</time>
                        </div>
                        <div className={cn('mt-0.5 max-w-[70ch] break-words whitespace-pre-wrap', !m.content && 'text-muted-foreground')}>
                          {m.content ? renderContent(m, roleNames) : t('ticket.noTextContent')}
                        </div>
                        {m.attachments?.map(a => (
                          <a key={a.url} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-primary-text underline-offset-4 hover:underline"
                            href={a.url} target="_blank" rel="noreferrer">
                            <Paperclip className="size-4" /> {a.name}
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <Empty>{t('ticket.noMessages')}</Empty>}
            </div>
          )}

          {canReply && (
            <div className="mt-4 grid gap-1.5 border-t pt-4">
              <Label htmlFor={replyId}>{t('ticket.replyLabel')}</Label>
              <Textarea
                id={replyId}
                rows={3}
                maxLength={2000}
                aria-describedby={countId}
                placeholder={data.isMine && !can('tickets.reply')
                  ? t('ticket.replyAsSelf')
                  : t('ticket.replyAsBot')}
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <span id={countId} className="text-small text-muted-foreground tabular-nums">{reply.length}/2000</span>
                <Button disabled={busy || !reply.trim()} onClick={send}><PaperPlaneRight /> {t('ticket.send')}</Button>
              </div>
            </div>
          )}
          {/* !! is load-bearing: `locked` is 0/1, and `cond && 0` renders a literal "0". */}
          {isOpen && !!ticket.locked && (
            <p className="mt-3 text-small text-muted-foreground">{t('ticket.lockedHint')}</p>
          )}
          {!isOpen && <p className="mt-3 text-small text-muted-foreground">{t('ticket.closedHint')}</p>}
        </SectionCard>
      </div>
    </>
  );
}
