import { useEffect, useState, useRef } from 'react';
import { PlayIcon, SquareIcon, RotateCwIcon, RefreshCwIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner } from '../ui.jsx';
import { parseAnsi } from '../ansi.js';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';

/** Render one log line, translating the bot's ANSI colours into styled spans. */
function LogLine({ line }) {
  const runs = parseAnsi(line);
  if (runs.length === 0) return <div>&nbsp;</div>;
  return <div>{runs.map((run, i) => <span key={i} style={run.style}>{run.text}</span>)}</div>;
}

const LABEL = { running: 'Running', stopped: 'Stopped', starting: 'Starting…', stopping: 'Stopping…', crashed: 'Crashed' };
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

  const refresh = () => {
    api.botStatus().then(setState).catch(e => setError(e.message));
    api.botLogs().then(({ lines }) => setLogs(lines)).catch(() => {});
  };

  // The dashboard is the bot's parent process, so it stays reachable even while
  // the bot is stopped or crashed — that is exactly when you need this screen.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [logs]);

  const act = async (action) => {
    setBusy(action); setError(null); setNotice(null);
    try {
      const res = await api.botAction(action);
      setNotice(res.output ? `${action} finished.` : `${action} triggered.`);
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
      <div className="mb-5"><h1 className="font-display text-xl font-bold">Bot control</h1></div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', DOT[status])} />
              <strong>{LABEL[status] ?? status}</strong>
              {state?.pid ? <span className="text-muted-foreground text-sm">PID {state.pid}</span> : null}
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCwIcon /> Refresh</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || running} onClick={() => act('start')}><PlayIcon /> Start</Button>
            <Button disabled={busy} onClick={() => act('restart')}><RotateCwIcon /> Restart</Button>
            <Button variant="destructive" disabled={busy || !running} onClick={() => act('stop')}><SquareIcon /> Stop</Button>
            <Button variant="secondary" disabled={busy} onClick={() => act('update')}>
              <RefreshCwIcon /> {busy === 'update' ? 'Updating…' : 'Update'}
            </Button>
          </div>
          {busy === 'update' && (
            <p className="text-muted-foreground text-xs">git pull + npm install — this can take a couple of minutes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Console</CardTitle>
          <CardDescription>Live output of the bot process.</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={consoleRef} className="ansi-console h-[calc(100vh-22rem)] min-h-[420px] overflow-y-auto rounded-md border bg-black/40 p-3 text-[11.5px] leading-relaxed">
            {logs.length
              ? logs.map((line, i) => <LogLine key={i} line={line} />)
              : <span className="text-muted-foreground">No output yet.</span>}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
