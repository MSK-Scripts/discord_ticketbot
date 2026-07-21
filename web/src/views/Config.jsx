import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Banner, Empty } from '../ui.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { CodeEditor } from '@/components/CodeEditor.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { InfoIcon } from 'lucide-react';
import ModeSwitch from '../botconfig/ModeSwitch.jsx';
import ConfigForm from '../botconfig/ConfigForm.jsx';
import EnvEditor from '../botconfig/EnvEditor.jsx';
import { safeParse } from '../botconfig/jsoncEdit.js';
import { validateBotConfig } from '../botconfig/validateConfig.js';

// .env is owner-only on the server (bot token + session secret), so non-owners
// never see the tab. `kind` drives which endpoint and editor a file uses; `form`
// marks whether a structured form exists (locales are raw-JSON only).
const STATIC_FILES = [
  { id: 'config',   label: 'config.jsonc',   kind: 'config',  form: true, ownerOnly: false },
  { id: 'snippets', label: 'snippets.jsonc', kind: 'snippet', form: true, ownerOnly: false },
  { id: 'env',      label: '.env',           kind: 'env',     form: true, ownerOnly: true },
];

const localeName = (id) => (id.startsWith('locale:') ? id.slice('locale:'.length) : null);

// main.json is the English template, not a language you run the bot in.
const isEditableLocale = (file) => /\.json$/i.test(file) && file !== 'main.json';

const LANG_LABEL = { main: 'Main (MSK Internal)', en: 'English', de: 'German', hu: 'Hungarian', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', tr: 'Turkish' };
const langLabel = (code) => LANG_LABEL[code] ?? code;

/** The locale codes a config actually references (bot language + transcript language). */
const deriveLangs = (cfgContent) => {
  const m = safeParse(cfgContent) || {};
  return [m.lang, m.transcriptLang].filter(Boolean);
};

export default function Config({ me }) {
  const [file, setFile] = useState('config');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState('');
  const [lookups, setLookups] = useState(null);
  const [locales, setLocales] = useState([]);
  const [activeLangs, setActiveLangs] = useState([]); // locale codes the config actually uses
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);
  const [viewMode, setViewMode] = useState('form');
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);

  const canEdit = me.isOwner || me.permissions.includes('config.edit');

  // Language dropdowns list every locale file that exists (except the template).
  const localeOptions = locales
    .filter(isEditableLocale)
    .map(f => { const code = f.replace(/\.json$/i, ''); return { value: code, label: `${langLabel(code)} (${f})` }; });

  // Only the locale(s) the config actually uses get a tab — not every file in
  // locales/. The active languages come from config.lang + config.transcriptLang.
  const activeLocaleFiles = [...new Set(activeLangs)]
    .map(code => `${code}.json`)
    .filter(name => locales.includes(name) && isEditableLocale(name));

  const FILES = [
    ...STATIC_FILES,
    ...activeLocaleFiles.map(name => ({ id: `locale:${name}`, label: name, kind: 'locale', form: false, ownerOnly: false })),
  ].filter(f => !f.ownerOnly || me.isOwner);

  const current = FILES.find(f => f.id === file) ?? FILES[0];
  const dirty = content !== saved;
  const effectiveMode = canEdit && current.form ? viewMode : 'file';

  // config.jsonc validation mirrors the bot; errors block Save. Only the config
  // file has semantic rules — the server re-validates everything anyway.
  const issues = useMemo(
    () => (current.kind === 'config' ? validateBotConfig(safeParse(content)) : []),
    [current.kind, content],
  );
  const blockingErrors = issues.filter(i => i.severity === 'error');
  const hasBlockingErrors = effectiveMode === 'form' && blockingErrors.length > 0;

  useEffect(() => {
    api.locales().then(({ files }) => setLocales(files)).catch(() => setLocales([]));
    api.lookups().then(setLookups).catch(() => setLookups(null));
  }, []);

  useEffect(() => {
    setLoading(true); setError(null); setNotice(null);
    const ln = localeName(file);
    const req = ln ? api.locale(ln) : api.config(file);
    req.then(({ content }) => { setContent(content); setSaved(content); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [file]);

  // Which locale tabs to show follows the config's active languages. Derived live
  // while editing config.jsonc so changing the language updates the tabs at once.
  // The identity check prevents a re-render loop (activeLangs feeds back into FILES).
  useEffect(() => {
    if (file !== 'config') return;
    const next = deriveLangs(content);
    setActiveLangs(prev => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
  }, [file, content]);

  // Inline confirms instead of window.confirm(): a suppressed dialog would return
  // false and the switch would silently not happen.
  const switchFile = (next) => {
    if (next === file) return;
    if (dirty) { setPendingSwitch(next); return; }
    setFile(next);
  };
  const confirmSwitch = () => { setFile(pendingSwitch); setPendingSwitch(null); };

  const switchMode = (next) => {
    if (next === viewMode) return;
    if (dirty) { setPendingMode(next); return; }
    setViewMode(next);
  };
  const confirmMode = () => { setViewMode(pendingMode); setPendingMode(null); };

  const save = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const ln = localeName(file);
      await (ln ? api.saveLocale(ln, content) : api.saveConfig(file, content));
      setSaved(content);
      setNotice('Saved. Restart the bot for the changes to take effect.');
    } catch (e) {
      setError(e.detail ? `${e.message}\n${e.detail}` : e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = (id) => {
    navigator.clipboard?.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  const LookupList = ({ title, entries }) => (
    <div className="mb-4">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      {!entries?.length ? <p className="text-muted-foreground text-xs">None.</p> : (
        <div className="max-h-60 overflow-y-auto pr-1">
          {entries.map(e => (
            <button key={e.id} onClick={() => copy(e.id)} title="Click to copy the ID"
              className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left cursor-pointer">
              <span className="truncate text-sm">{e.name}</span>
              <span className="text-muted-foreground shrink-0 font-mono text-[11px]">{copied === e.id ? 'copied!' : e.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Configuration</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            {dirty && <Button variant="outline" size="sm" onClick={() => setContent(saved)}>Discard</Button>}
            <Button size="sm" disabled={busy || !dirty || hasBlockingErrors} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        )}
      </div>

      {error && <Banner type="error" onClose={() => setError(null)}>{error}</Banner>}
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      {pendingSwitch && (
        <Alert className="mb-3">
          <InfoIcon />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>You have unsaved changes. Switch file and discard them?</span>
            <span className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={confirmSwitch}>Discard &amp; switch</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingSwitch(null)}>Cancel</Button>
            </span>
          </AlertDescription>
        </Alert>
      )}
      {pendingMode && (
        <Alert className="mb-3">
          <InfoIcon />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>You have unsaved changes. Switch view and discard them?</span>
            <span className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={confirmMode}>Discard &amp; switch</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingMode(null)}>Cancel</Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILES.map(f => (
            <Button key={f.id} size="sm" variant={file === f.id ? 'default' : 'outline'} onClick={() => switchFile(f.id)}>
              {f.label}
            </Button>
          ))}
          {dirty && <span className="text-muted-foreground text-xs">● unsaved changes</span>}
        </div>
        {canEdit && current.form && <ModeSwitch value={viewMode} onChange={switchMode} />}
      </div>

      {hasBlockingErrors && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {blockingErrors.length} problem{blockingErrors.length > 1 ? 's' : ''} must be fixed before saving:
            <ul className="mt-1.5 list-disc pl-4 text-xs">
              {blockingErrors.slice(0, 6).map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {current.kind === 'env' && (
        <Alert className="mb-4">
          <InfoIcon />
          <AlertDescription>
            The <strong>.env</strong> file is restricted to the <strong>server owner</strong>. It holds the
            bot token, session secret and OAuth secret, so staff with <strong>Edit configuration</strong> can
            edit <strong>config.jsonc</strong>, snippets and the locale files, but can never see or edit this
            file.
          </AlertDescription>
        </Alert>
      )}

      <div className={cn('grid gap-4', current.form && 'xl:grid-cols-[minmax(0,1fr)_280px]')}>
        <Card className="min-w-0">
          <CardContent className="min-w-0">
            {loading ? <Empty>Loading…</Empty> : effectiveMode === 'file' ? (
              <CodeEditor
                className="h-[calc(100vh-16rem)] min-h-[480px]"
                value={content}
                readOnly={!canEdit}
                onChange={setContent}
                language={current.kind === 'env' ? 'env' : 'jsonc'}
              />
            ) : current.kind === 'env' ? (
              <EnvEditor content={content} onChange={setContent} />
            ) : (
              <ConfigForm file={current.id} content={content} onContentChange={setContent} issues={issues} localeOptions={localeOptions} />
            )}
          </CardContent>
        </Card>

        {current.form && (
          <Card>
            <CardHeader>
              <CardTitle>Discord IDs</CardTitle>
              <CardDescription>Click a name to copy its ID.</CardDescription>
            </CardHeader>
            <CardContent>
              {!lookups ? <p className="text-muted-foreground text-xs">Could not load (is the bot in the server?).</p> : (
                <>
                  <LookupList title="Roles" entries={lookups.roles} />
                  <LookupList title="Channels" entries={lookups.channels} />
                  <LookupList title="Categories" entries={lookups.categories} />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
