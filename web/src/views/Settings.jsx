import { useEffect, useId, useRef, useState } from 'react';
import { ArrowCounterClockwise, UploadSimple, WarningCircle } from '@/components/icons.jsx';
import { api } from '../api.js';
import { Banner, Empty, PageHeader, SectionCard } from '../ui.jsx';
import { applyAccent, applyFavicon, hexToRgb } from '../settings.js';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

// The built-in MSK green (index.css --primary, light theme). Shown as the picker
// value when no custom accent is set, and what "Reset" returns to.
const DEFAULT_ACCENT = '#27762e';

/**
 * Dashboard appearance: accent colour + favicon. Gated by settings.view (read) and
 * settings.edit (change); the owner always holds both. A member with only
 * settings.view sees the current branding but every control is disabled: the API
 * enforces the same split, this just avoids offering a button that would 403.
 * Changes here re-brand the panel for every user, and the accent previews live
 * before you save.
 */
export default function Settings({ me }) {
  const canEdit = me.isOwner || me.permissions.includes('settings.edit');
  const [loaded, setLoaded] = useState(false);
  const [accent, setAccentInput] = useState(DEFAULT_ACCENT);
  const [savedAccent, setSavedAccent] = useState(null);   // null = using the default
  const [faviconVersion, setFaviconVersion] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);
  const accentId = useId();
  const accentHintId = useId();
  const t = useT();

  useEffect(() => {
    api.dashboardSettings()
      .then(s => {
        setSavedAccent(s.accent);
        setAccentInput(s.accent || DEFAULT_ACCENT);
        setFaviconVersion(s.faviconVersion);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const validHex = !!hexToRgb(accent);
  const accentDirty = validHex && accent.toLowerCase() !== (savedAccent || DEFAULT_ACCENT).toLowerCase();

  // Live preview: apply while typing/picking so the whole panel reflects the colour
  // immediately. Saving persists it; leaving without saving reverts on reload.
  const preview = (hex) => { setAccentInput(hex); if (hexToRgb(hex)) applyAccent(hex); };

  const saveAccent = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.saveAccent(accent);
      applyAccent(accent);
      setSavedAccent(accent.toLowerCase());
      setNotice(t('settings.accentSaved'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const resetAccent = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.saveAccent(null);
      applyAccent(null);                 // revert to the stylesheet default
      setSavedAccent(null);
      setAccentInput(DEFAULT_ACCENT);
      setNotice(t('settings.accentReset'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const uploadFavicon = async () => {
    if (!file) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const { version } = await api.uploadFavicon(file);
      setFaviconVersion(version);
      applyFavicon(version);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setNotice(t('settings.faviconUpdated'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const resetFavicon = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.resetFavicon();
      setFaviconVersion(null);
      applyFavicon(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setNotice(t('settings.faviconReset'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const faviconSrc = faviconVersion ? `/favicon.ico?v=${faviconVersion}` : '/favicon.ico';

  if (!loaded) return <Empty loading>{t('common.loading')}</Empty>;

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={<p>{t('settings.introShared')} {canEdit ? t('settings.introCanEdit') : t('settings.introReadOnly')}</p>}
      />

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <div className="grid items-start gap-[var(--app-gutter)] @4xl:grid-cols-2">
        <SectionCard title={t('settings.accentTitle')} description={t('settings.accentHint')} bodyClassName="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor={accentId}>{t('settings.accentLabel')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexToRgb(accent) ? accent : DEFAULT_ACCENT}
                onChange={e => preview(e.target.value)}
                disabled={!canEdit}
                className="size-11 shrink-0 cursor-pointer rounded-md border-[1.5px] border-input bg-card p-1 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('settings.accentTitle')}
              />
              <Input
                id={accentId}
                className="max-w-56 font-mono"
                value={accent}
                placeholder={DEFAULT_ACCENT}
                onChange={e => preview(e.target.value)}
                disabled={!canEdit}
                aria-invalid={!validHex || undefined}
                aria-describedby={accentHintId}
                spellCheck={false}
              />
            </div>
            <div id={accentHintId}>
              {!validHex && (
                <p className="flex items-start gap-1.5 text-small font-semibold text-danger">
                  <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
                  {t('settings.accentInvalid', { hex: DEFAULT_ACCENT })}
                </p>
              )}
              {savedAccent == null && <p className="text-small text-muted-foreground">{t('settings.accentDefault', { hex: DEFAULT_ACCENT })}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={busy || !accentDirty || !canEdit} onClick={saveAccent}>{t('settings.accentSave')}</Button>
            <Button variant="outline" disabled={busy || savedAccent == null || !canEdit} onClick={resetAccent}>
              <ArrowCounterClockwise /> {t('common.resetToDefault')}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.faviconTitle')} description={t('settings.faviconHint')} bodyClassName="grid gap-5">
          <div className="flex items-center gap-3">
            <img
              src={faviconSrc}
              alt={t('settings.faviconAlt')}
              className="size-12 rounded-md border bg-muted object-contain p-1.5"
            />
            <p className="text-muted-foreground">
              {faviconVersion ? t('settings.faviconCustom') : t('settings.faviconDefault')}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="favicon-file">{t('settings.faviconUploadLabel')}</Label>
            <Input
              id="favicon-file"
              ref={fileRef}
              type="file"
              accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              disabled={!canEdit}
              className="cursor-pointer py-1.5 text-small"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={busy || !file || !canEdit} onClick={uploadFavicon}><UploadSimple /> {t('settings.faviconUpload')}</Button>
            <Button variant="outline" disabled={busy || !faviconVersion || !canEdit} onClick={resetFavicon}>
              <ArrowCounterClockwise /> {t('common.resetToDefault')}
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
