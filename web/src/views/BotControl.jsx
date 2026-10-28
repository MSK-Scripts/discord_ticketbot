import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { ArrowClockwise, ArrowDown, ArrowsClockwise, Play, Stop } from '@/components/icons.jsx';
import { api } from '../api.js';
import { Banner, BotStatus, PageHeader, SectionCard } from '../ui.jsx';
import { parseAnsi } from '../ansi.js';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';

/** Render one log line, translating the bot's ANSI colours into styled spans. */
function LogLine({ line }) {
  const runs = parseAnsi(line);
  if (runs.length === 0) return <div>&nbsp;</div>;
  return <div>{runs.map((run, i) => <span key={i} style={run.style}>{run.text}</span>)}</div>;
}

/**
 * How close to the bottom still counts as "following the tail". A couple of
 * pixels of slack, because fractional scroll positions and zoom levels mean
 * scrollTop rarely hits scrollHeight - clientHeight exactly.
 */
const STICK_THRESHOLD_PX = 24;

/** The poll hands us a fresh array every 3s; only re-render on real changes. */
function sameLines(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export default function BotControl() {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const consoleRef = useRef(null);
  // Whether the console should keep following new output. Lives in a ref so the
  // poll below can read it without re-subscribing every render.
  const stickToBottom = useRef(true);
  const [scrolledUp, setScrolledUp] = useState(false);
  const t = useT();

  const refresh = () => {
    api.botStatus().then(setState).catch(e => setError(e.message));
    api.botLogs()
      .then(({ lines }) => setLogs(prev => (sameLines(prev, lines) ? prev : lines)))
      .catch(() => {});
  };

  // The dashboard is the bot's parent process, so it stays reachable even while
  // the bot is stopped or crashed; that is exactly when you need this screen.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  // Follow the tail, but only while the reader is already at the bottom. Scrolling
  // up is how you read a stack trace, and the 3s poll used to yank you back down
  // again a moment later.
  useLayoutEffect(() => {
    const el = consoleRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleConsoleScroll = () => {
    const el = consoleRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX;
    stickToBottom.current = atBottom;
    setScrolledUp(!atBottom);
  };

  const jumpToLatest = () => {
    const el = consoleRef.current;
    if (!el) return;
    stickToBottom.current = true;
    setScrolledUp(false);
    el.scrollTop = el.scrollHeight;
  };

  const act = async (action) => {
    setBusy(action); setError(null); setNotice(null);
    try {
      const res = await api.botAction(action);
      setNotice(t(res.output ? 'bot.actionFinished' : 'bot.actionTriggered', { action: t(`bot.${action}`) }));
      setTimeout(refresh, 1500);
    } catch (e) {
      setError(e.detail ? `${e.message}: ${e.detail}` : e.message);
    } finally {
      setBusy(null);
    }
  };

  const status = state?.status ?? 'stopped';
  const running = status === 'running';

  return (
    <>
      <PageHeader
        title={t('bot.title')}
        badge={(
          <>
            <BotStatus status={status} />
            {state?.pid ? <span className="text-small text-muted-foreground tabular-nums">{t('bot.pid', { pid: state.pid })}</span> : null}
          </>
        )}
        actions={<Button variant="outline" onClick={refresh}><ArrowsClockwise /> {t('common.refresh')}</Button>}
      />

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <div className="mb-[var(--app-gutter-y)] grid gap-2">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={busy || running} onClick={() => act('start')}><Play /> {t('bot.start')}</Button>
          <Button disabled={busy} onClick={() => act('restart')}><ArrowClockwise /> {t('bot.restart')}</Button>
          <Button variant="danger" disabled={busy || !running} onClick={() => act('stop')}><Stop /> {t('bot.stop')}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => act('update')}>
            <ArrowsClockwise className={busy === 'update' ? 'animate-spin' : undefined} /> {busy === 'update' ? t('bot.updating') : t('bot.update')}
          </Button>
        </div>
        {busy === 'update' && (
          <p role="status" className="text-small text-muted-foreground">{t('bot.updateHint')}</p>
        )}
      </div>

      <SectionCard title={t('bot.consoleTitle')} description={t('bot.consoleHint')}>
        <div className="relative">
          {/* A focusable region so the log scrolls with the keyboard. Not
              role="log": a screen reader would read every new line aloud. */}
          <div
            ref={consoleRef}
            onScroll={handleConsoleScroll}
            role="region"
            aria-label={t('bot.consoleTitle')}
            tabIndex={0}
            className="ansi-console h-[max(26rem,calc(100dvh-26rem))] overflow-y-auto rounded-md p-4 text-[0.8125rem] leading-relaxed"
          >
            {logs.length
              ? logs.map((line, i) => <LogLine key={i} line={line} />)
              : <span className="text-log-dim">{t('bot.noOutput')}</span>}
          </div>
          {scrolledUp && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute right-5 bottom-4 shadow-card-hover"
              onClick={jumpToLatest}
            >
              <ArrowDown /> {t('bot.jumpToLatest')}
            </Button>
          )}
        </div>
      </SectionCard>
    </>
  );
}
