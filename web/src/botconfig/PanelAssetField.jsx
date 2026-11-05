// Panel logo / banner: the file name field plus upload, preview and reset.
//
// The upload goes to /api/panel-assets/<slot>. The server checks and re-encodes
// the image, stores it under a generated name in assets/ and writes that name
// into config.jsonc itself; onStored then mirrors the change into the editor so
// the form does not show the file as unsaved (or, when the server could not
// patch the file, leaves it as an unsaved edit to save by hand).
//
// The preview shows what the bot would use with the SAVED config, served by the
// dashboard with the type taken from the bytes. An SVG is never previewed.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../api.js';
import { useT } from '../i18n.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ArrowCounterClockwise, UploadSimple } from '@/components/icons.jsx';
import { Field, TextField } from './inputs.jsx';

const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

export default function PanelAssetField({ field, value, error, onChange, onStored }) {
  const t = useT();
  const slot = field.slot;
  const inputId = useId();
  const fileRef = useRef(null);
  const [state, setState] = useState(null);       // GET /panel-assets
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);   // { tone: 'success'|'error', text }
  const [previewFailed, setPreviewFailed] = useState(false);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => api.panelAssets().then(setState).catch(() => setState(null)), []);
  useEffect(() => { load(); }, [load]);

  const current = state?.slots?.[slot];
  const maxMb = state?.maxMb ?? 5;

  const afterChange = async (text) => {
    setMessage({ tone: 'success', text });
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setPreviewFailed(false);
    setVersion(v => v + 1);
    await load();
  };

  const upload = async () => {
    if (!file) return;
    if (state && file.size > state.maxBytes) {
      setMessage({ tone: 'error', text: t('config.panelAssetTooLarge', { mb: maxMb }) });
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const r = await api.uploadPanelAsset(slot, file);
      onStored(field.path, r.file, r.configUpdated);
      await afterChange(r.configUpdated ? t('config.panelAssetUploaded') : t('config.panelAssetUploadedUnsaved'));
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true); setMessage(null);
    try {
      const r = await api.resetPanelAsset(slot);
      onStored(field.path, r.file, r.configUpdated);
      await afterChange(r.configUpdated ? t('config.panelAssetResetDone') : t('config.panelAssetUploadedUnsaved'));
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const showPreview = current?.exists && !previewFailed;
  const previewSrc = `/api/panel-assets/${slot}/preview?f=${encodeURIComponent(current?.file ?? '')}&v=${version}`;
  const alt = slot === 'logo' ? t('config.panelAssetAltLogo') : t('config.panelAssetAltBanner');

  return (
    <div className="grid gap-3">
      <Field label={field.label} help={field.help} error={error}>
        <TextField value={value} onChange={onChange} />
      </Field>

      <div className="grid gap-3 rounded-md border bg-muted/40 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card',
            slot === 'logo' ? 'size-20' : 'h-20 w-48',
          )}>
            {showPreview ? (
              <img src={previewSrc} alt={alt} className="max-h-full max-w-full object-contain" onError={() => setPreviewFailed(true)} />
            ) : (
              <span className="px-2 text-center text-label text-muted-foreground">{t('config.panelAssetNoPreview')}</span>
            )}
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="text-small font-semibold">{t('config.panelAssetCurrent')}</span>
            <span className="truncate font-mono text-label text-muted-foreground">{current?.file ?? '–'}</span>
            <span className="text-label text-muted-foreground">{t('config.panelAssetSavedOnly')}</span>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={inputId}>{t('config.panelAssetChoose')}</Label>
          <Input
            id={inputId}
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(null); }}
            className="cursor-pointer py-1.5 text-small"
          />
          <p className="max-w-[65ch] text-small text-muted-foreground">
            {t('config.panelAssetHint', { mb: maxMb })}
            {state?.scanned ? ` ${t('config.panelAssetScanned')}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || !file} onClick={upload}>
            <UploadSimple /> {busy ? t('config.panelAssetUploading') : t('config.panelAssetUpload')}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !current || current.file === current.defaultFile} onClick={reset}>
            <ArrowCounterClockwise /> {t('common.resetToDefault')}
          </Button>
        </div>

        <p role="status" aria-live="polite" className={cn(
          'text-small',
          message?.tone === 'error' ? 'font-semibold text-danger' : 'text-success',
          !message && 'sr-only',
        )}>
          {message?.text ?? ''}
        </p>
      </div>
    </div>
  );
}
