import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { PlayIcon, SquareIcon, RotateCwIcon, RefreshCwIcon, ArrowDownIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner } from '../ui.jsx';
import { parseAnsi } from '../ansi.js';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';

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

/** The poll hands us a fresh array every 3s — only re-render on real changes. */
function sameLines(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const DOT = {
  running: 'bg-primary', stopped: 'bg-muted-foreground', crashed: 'bg-destructive',
  starting: 'bg-warn', stopping: 'bg-warn',
};

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
  // the bot is stopped or crashed — that is exactly when you need this screen.
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
      <div className="mb-5"><h1 className="font-display text-xl font-bold">{t('bot.title')}</h1></div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', DOT[status])} />
              <strong>{t(`bot.${status}`)}</strong>
              {state?.pid ? <span className="text-muted-foreground text-sm">{t('bot.pid', { pid: state.pid })}</span> : null}
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCwIcon /> {t('common.refresh')}</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || running} onClick={() => act('start')}><PlayIcon /> {t('bot.start')}</Button>
            <Button disabled={busy} onClick={() => act('restart')}><RotateCwIcon /> {t('bot.restart')}</Button>
            <Button variant="destructive" disabled={busy || !running} onClick={() => act('stop')}><SquareIcon /> {t('bot.stop')}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => act('update')}>
              <RefreshCwIcon /> {busy === 'update' ? t('bot.updating') : t('bot.update')}
            </Button>
          </div>
          {busy === 'update' && (
            <p className="text-muted-foreground text-xs">{t('bot.updateHint')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('bot.consoleTitle')}</CardTitle>
          <CardDescription>{t('bot.consoleHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div
              ref={consoleRef}
              onScroll={handleConsoleScroll}
              className="ansi-console h-[calc(100vh-22rem)] min-h-[420px] overflow-y-auto rounded-md border bg-black/40 p-3 text-[11.5px] leading-relaxed"
            >
              {logs.length
                ? logs.map((line, i) => <LogLine key={i} line={line} />)
                : <span className="text-muted-foreground">{t('bot.noOutput')}</span>}
            </div>
            {scrolledUp && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-5 bottom-3 shadow-md"
                onClick={jumpToLatest}
              >
                <ArrowDownIcon /> {t('bot.jumpToLatest')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
