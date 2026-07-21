import { useEffect, useRef, useState } from 'react';
import { UploadIcon, RotateCcwIcon } from 'lucide-react';
import { api } from '../api.js';
import { Banner, Empty } from '../ui.jsx';
import { applyAccent, applyFavicon, hexToRgb } from '../settings.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

// The built-in MSK green (index.css --primary). Shown as the picker value when no
// custom accent is set, and what "Reset" returns to.
const DEFAULT_ACCENT = '#5eb131';

/**
 * Dashboard appearance: accent colour + favicon. Owner-only (the tab is hidden for
 * everyone else and the API re-checks ownership). Changes here re-brand the panel
 * for every user, and the accent previews live before you save.
 */
export default function Settings() {
  const [loaded, setLoaded] = useState(false);
  const [accent, setAccentInput] = useState(DEFAULT_ACCENT);
  const [savedAccent, setSavedAccent] = useState(null);   // null = using the default
  const [faviconVersion, setFaviconVersion] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

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
      setNotice('Accent colour saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const resetAccent = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.saveAccent(null);
      applyAccent(null);                 // revert to the stylesheet default
      setSavedAccent(null);
      setAccentInput(DEFAULT_ACCENT);
      setNotice('Accent colour reset to the default.');
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
      setNotice('Favicon updated.');
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
      setNotice('Favicon reset to the default.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const faviconSrc = faviconVersion ? `/favicon.ico?v=${faviconVersion}` : '/favicon.ico';

  if (!loaded) return <Empty>Loading…</Empty>;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-xl font-bold">Dashboard settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Branding for this dashboard. Only you as the server owner can change it, and it applies to everyone who uses it.
        </p>
      </div>

      <Banner type="error" onClose={() => setError(null)}>{error}</Banner>
      <Banner type="success" onClose={() => setNotice(null)}>{notice}</Banner>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Accent colour ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Accent colour</CardTitle>
            <CardDescription>Buttons, highlights, the active menu item and focus rings. Previews live.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hexToRgb(accent) ? accent : DEFAULT_ACCENT}
                  onChange={e => preview(e.target.value)}
                  className="border-input h-9 w-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                  aria-label="Accent colour"
                />
                <Input
                  className="font-mono"
                  value={accent}
                  placeholder={DEFAULT_ACCENT}
                  onChange={e => preview(e.target.value)}
                />
              </div>
              {!validHex && <p className="text-destructive text-xs">Enter a hex colour like {DEFAULT_ACCENT}.</p>}
              {savedAccent == null && <p className="text-muted-foreground text-xs">Currently using the default ({DEFAULT_ACCENT}).</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !accentDirty} onClick={saveAccent}>Save colour</Button>
              <Button size="sm" variant="outline" disabled={busy || savedAccent == null} onClick={resetAccent}>
                <RotateCcwIcon /> Reset to default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Favicon ───────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Favicon</CardTitle>
            <CardDescription>The small icon in the browser tab. PNG or ICO, up to 256 KB.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src={faviconSrc}
                alt="Current favicon"
                className="size-10 rounded border bg-white/5 object-contain p-1"
              />
              <div className="text-muted-foreground text-sm">
                {faviconVersion ? 'Custom favicon in use.' : 'Using the default favicon.'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="favicon-file">Upload a new favicon</Label>
              <input
                id="favicon-file"
                ref={fileRef}
                type="file"
                accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="text-muted-foreground file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !file} onClick={uploadFavicon}><UploadIcon /> Upload</Button>
              <Button size="sm" variant="outline" disabled={busy || !faviconVersion} onClick={resetFavicon}>
                <RotateCcwIcon /> Reset to default
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
