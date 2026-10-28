// Form input primitives for the bot config editor, built on the UI primitives.
// The prop API (value / onChange) is kept simple so FormRenderer does not need
// to know which control it is rendering.
//
// Field ties its label, help and error to whichever control sits inside it
// (shop FormField): the control picks up id, aria-describedby and aria-invalid
// from a context, so a screen reader announces the label and the hint with
// the field, and a click on the label focuses it.

import { createContext, useContext, useState, useEffect, useId, useRef } from 'react';
import { WarningCircle, X } from '@/components/icons.jsx';
import { cn } from '@/lib/utils.js';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select as UiSelect, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select.jsx';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SNOWFLAKE_RE = /^\d{17,20}$/;

const FieldContext = createContext({});

/** id, aria-describedby and aria-invalid of the surrounding Field, if any. */
const useFieldProps = () => useContext(FieldContext);

/** Label + optional help + optional error wrapper. */
export function Field({ label, help, error, children }) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help && !error ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }}>
      <div className="grid content-start gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {children}
        {help && !error && <p id={helpId} className="max-w-[65ch] text-small text-muted-foreground">{help}</p>}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-small font-semibold text-danger">
            <WarningCircle className="mt-0.5 size-4 shrink-0" weight="bold" />
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Toggle switch with its label and help inline (no outer Field). */
export function Toggle({ checked, onChange, label, help }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid min-w-0 gap-0.5">
        <Label htmlFor={id} className="cursor-pointer">{label}</Label>
        {help && <p id={`${id}-help`} className="max-w-[65ch] text-small text-muted-foreground">{help}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={help ? `${id}-help` : undefined} />
    </div>
  );
}

export function Select({ value, onChange, options }) {
  const field = useFieldProps();
  const v = value ?? '';
  const known = options.some(o => o.value === v);
  return (
    <UiSelect value={v} onValueChange={onChange}>
      <SelectTrigger {...field}><SelectValue /></SelectTrigger>
      <SelectContent>
        {/* Keep an unknown current value selectable instead of snapping to option 0. */}
        {v && !known && <SelectItem value={v}>{v}</SelectItem>}
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </UiSelect>
  );
}

export function TextField({ value, onChange, placeholder }) {
  const field = useFieldProps();
  return <Input {...field} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, rows = 4, placeholder }) {
  const field = useFieldProps();
  return <Textarea {...field} className="font-mono text-small" value={value ?? ''} rows={rows} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

export function NumberInput({ value, onChange, min, max }) {
  const field = useFieldProps();
  const [text, setText] = useState(String(value ?? 0));
  const ref = useRef(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setText(String(value ?? 0));
  }, [value]);
  return (
    <Input
      {...field}
      ref={ref}
      type="number"
      className="max-w-48 tabular-nums"
      value={text}
      min={min}
      max={max}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        let n = Number(text);
        if (!Number.isFinite(n)) n = min ?? 0;
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        setText(String(n));
        onChange(n);
      }}
    />
  );
}

export function ColorPicker({ value, onChange, emptyHint }) {
  const field = useFieldProps();
  const isHex = HEX_RE.test(value ?? '');
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={isHex ? value : '#5eb131'}
        onChange={e => onChange(e.target.value)}
        className="size-11 shrink-0 cursor-pointer rounded-md border-[1.5px] border-input bg-card p-1"
        aria-label="Color"
      />
      <Input {...field} className="max-w-56 font-mono" value={value ?? ''} placeholder={emptyHint ?? '#rrggbb'} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export function EmojiInput({ value, onChange }) {
  const field = useFieldProps();
  return <Input {...field} className="max-w-48" value={value ?? ''} placeholder="💡 or <:name:id>" onChange={e => onChange(e.target.value)} />;
}

/** Tag input for Discord ID lists. Invalid (non-snowflake) ids are flagged red. */
export function TagInput({ value, onChange, idKind }) {
  const field = useFieldProps();
  const [draft, setDraft] = useState('');
  const items = Array.isArray(value) ? value : [];

  const commit = (raw) => {
    const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...items];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setDraft('');
  };
  const remove = (id) => onChange(items.filter(x => x !== id));

  return (
    <div className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border-[1.5px] border-input bg-card px-2 py-1.5 focus-within:border-foreground">
      {items.map(id => {
        const bad = !SNOWFLAKE_RE.test(id);
        return (
          <span key={id}
            className={cn('inline-flex items-center gap-1 rounded-sm border py-0.5 pr-0.5 pl-1.5 font-mono text-label',
              bad ? 'border-danger text-danger' : 'border-transparent bg-accent-soft text-primary-text')}
            title={bad ? 'Not a valid Discord ID (17 to 20 digits)' : idKind}>
            {bad && <WarningCircle className="size-3.5" weight="bold" />}
            {id}
            <button type="button" onClick={() => remove(id)} aria-label={`Remove ${id}`}
              className="tap-target inline-flex size-6 cursor-pointer items-center justify-center rounded-sm opacity-80 hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </span>
        );
      })}
      <input
        {...field}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
          else if (e.key === 'Backspace' && draft === '' && items.length) remove(items[items.length - 1]);
        }}
        onBlur={() => commit(draft)}
        placeholder={items.length ? '' : 'ID + Enter'}
        className="min-h-8 min-w-24 flex-1 bg-transparent text-control text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
