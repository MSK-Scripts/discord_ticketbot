import { useEffect, useRef, useState } from 'react';
import { UploadIcon, RotateCcwIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner, Empty } from '../ui.jsx';
import { applyAccent, applyFavicon, hexToRgb } from '../settings.js';
import { useT } from '../i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

// The built-in MSK green (index.css --primary). Shown as the picker value when no
// custom accent is set, and what "Reset" returns to.
const DEFAULT_ACCENT = '#5eb131';

/**
 * Dashboard appearance: accent colour + favicon. Gated by settings.view (read) and
 * settings.edit (change); the owner always holds both. A member with only
 * settings.view sees the current branding but every control is disabled — the API
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

  if (!loaded) return <Empty>{t('common.loading')}</Empty>;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('settings.introShared')}{' '}
          {canEdit ? t('settings.introCanEdit') : t('settings.introReadOnly')}
        </p>
      </div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Accent colour ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.accentTitle')}</CardTitle>
            <CardDescription>{t('settings.accentHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.accentLabel')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hexToRgb(accent) ? accent : DEFAULT_ACCENT}
                  onChange={e => preview(e.target.value)}
                  disabled={!canEdit}
                  className="border-input h-9 w-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('settings.accentTitle')}
                />
                <Input
                  className="font-mono"
                  value={accent}
                  placeholder={DEFAULT_ACCENT}
                  onChange={e => preview(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              {!validHex && <p className="text-destructive text-xs">{t('settings.accentInvalid', { hex: DEFAULT_ACCENT })}</p>}
              {savedAccent == null && <p className="text-muted-foreground text-xs">{t('settings.accentDefault', { hex: DEFAULT_ACCENT })}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !accentDirty || !canEdit} onClick={saveAccent}>{t('settings.accentSave')}</Button>
              <Button size="sm" variant="outline" disabled={busy || savedAccent == null || !canEdit} onClick={resetAccent}>
                <RotateCcwIcon /> {t('common.resetToDefault')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Favicon ───────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.faviconTitle')}</CardTitle>
            <CardDescription>{t('settings.faviconHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src={faviconSrc}
                alt={t('settings.faviconAlt')}
                className="size-10 rounded border bg-white/5 object-contain p-1"
              />
              <div className="text-muted-foreground text-sm">
                {faviconVersion ? t('settings.faviconCustom') : t('settings.faviconDefault')}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="favicon-file">{t('settings.faviconUploadLabel')}</Label>
              <input
                id="favicon-file"
                ref={fileRef}
                type="file"
                accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                disabled={!canEdit}
                className="text-muted-foreground file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !file || !canEdit} onClick={uploadFavicon}><UploadIcon /> {t('settings.faviconUpload')}</Button>
              <Button size="sm" variant="outline" disabled={busy || !faviconVersion || !canEdit} onClick={resetFavicon}>
                <RotateCcwIcon /> {t('common.resetToDefault')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
