import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Banner, Empty, Note, PageHeader, SectionCard } from '../ui.jsx';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { CodeEditor } from '@/components/CodeEditor.jsx';
import { Copy, Check } from '@/components/icons.jsx';
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
  const t = useT();

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
      setNotice(t('config.saved'));
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
    <div className="grid gap-1.5">
      <h3 className="kicker text-muted-foreground">{title}</h3>
      {!entries?.length ? <p className="text-small text-muted-foreground">{t('common.none')}</p> : (
        <ul className="-mx-1 grid max-h-64 gap-0.5 overflow-y-auto px-1">
          {entries.map(e => (
            <li key={e.id}>
              <button type="button" onClick={() => copy(e.id)} title={t('config.copyHint')}
                className="grid min-h-11 w-full cursor-pointer gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted">
                <span className="min-w-0 truncate text-small font-semibold">{e.name}</span>
                <span className={cn('inline-flex min-w-0 items-center gap-1 font-mono text-label', copied === e.id ? 'font-semibold text-success' : 'text-muted-foreground')}>
                  {copied === e.id ? <><Check className="size-3.5" weight="bold" />{t('config.copied')}</> : <><Copy className="size-3.5" />{e.id}</>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('config.title')}
        badge={dirty && <span className="text-small font-semibold text-warning">{t('config.unsavedMarker')}</span>}
        actions={canEdit && (
          <>
            {dirty && <Button variant="outline" onClick={() => setContent(saved)}>{t('common.discard')}</Button>}
            <Button disabled={busy || !dirty || hasBlockingErrors} onClick={save}>{busy ? t('common.saving') : t('common.save')}</Button>
          </>
        )}
      />

      {/* The result of the last save is announced; a copied id too. */}
      <p className="sr-only" aria-live="polite">{copied ? t('config.copied') : ''}</p>

      {error && <Banner type="error" onClose={() => setError(null)}>{error}</Banner>}
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      {pendingSwitch && (
        <Note tone="warning" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t('config.unsavedFile')}</p>
            <span className="flex flex-wrap gap-2">
              <Button size="sm" variant="danger" onClick={confirmSwitch}>{t('config.discardAndSwitch')}</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingSwitch(null)}>{t('common.cancel')}</Button>
            </span>
          </div>
        </Note>
      )}
      {pendingMode && (
        <Note tone="warning" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t('config.unsavedView')}</p>
            <span className="flex flex-wrap gap-2">
              <Button size="sm" variant="danger" onClick={confirmMode}>{t('config.discardAndSwitch')}</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingMode(null)}>{t('common.cancel')}</Button>
            </span>
          </div>
        </Note>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('config.files')} className="flex flex-wrap gap-2">
          {FILES.map(f => (
            <Button key={f.id} variant={file === f.id ? 'primary' : 'outline'} aria-pressed={file === f.id}
              className="font-mono" onClick={() => switchFile(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
        {canEdit && current.form && <ModeSwitch value={viewMode} onChange={switchMode} />}
      </div>

      {hasBlockingErrors && (
        <Note tone="danger" className="mb-4">
          <p>{t('config.blockingErrors', { count: blockingErrors.length })}</p>
          <ul className="mt-1.5 list-disc pl-5">
            {blockingErrors.slice(0, 6).map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </Note>
      )}

      {current.kind === 'env' && (
        <Note className="mb-4"><p>{t('config.envNotice')}</p></Note>
      )}

      <div className={cn('grid items-start gap-[var(--app-gutter)]', current.form && '@5xl:grid-cols-[minmax(0,1fr)_clamp(17rem,24cqi,24rem)]')}>
        <div className="min-w-0">
          {loading ? <Empty loading>{t('common.loading')}</Empty> : effectiveMode === 'file' ? (
            <CodeEditor
              className="h-[max(30rem,calc(100dvh-20rem))]"
              value={content}
              readOnly={!canEdit}
              onChange={setContent}
              label={current.label}
              language={current.kind === 'env' ? 'env' : 'jsonc'}
            />
          ) : current.kind === 'env' ? (
            <EnvEditor content={content} onChange={setContent} />
          ) : (
            <ConfigForm file={current.id} content={content} onContentChange={setContent} issues={issues} localeOptions={localeOptions} />
          )}
        </div>

        {current.form && (
          <SectionCard title={t('config.lookupsTitle')} description={t('config.lookupsHint')} className="@5xl:sticky @5xl:top-[calc(var(--app-topbar)+1.5rem)]" bodyClassName="grid gap-5">
            {!lookups ? <p className="text-small text-muted-foreground">{t('config.lookupsFailed')}</p> : (
              <>
                <LookupList title={t('config.roles')} entries={lookups.roles} />
                <LookupList title={t('config.channels')} entries={lookups.channels} />
                <LookupList title={t('config.categories')} entries={lookups.categories} />
              </>
            )}
          </SectionCard>
        )}
      </div>
    </>
  );
}
