// Form input primitives for the bot config editor, built on the shadcn UI
// primitives. The prop API (value / onChange) is kept simple so FormRenderer does
// not need to know which control it is rendering.

import { useState, useEffect, useRef } from 'react';
import { XIcon } from 'lucide-react';
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

/** Label + optional help + optional error wrapper. */
export function Field({ label, help, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {help && !error && <p className="text-muted-foreground text-xs leading-relaxed">{help}</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

/** Toggle switch with its label and help inline (no outer Field). */
export function Toggle({ checked, onChange, label, help }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {help && <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{help}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function Select({ value, onChange, options }) {
  const v = value ?? '';
  const known = options.some(o => o.value === v);
  return (
    <UiSelect value={v} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {/* Keep an unknown current value selectable instead of snapping to option 0. */}
        {v && !known && <SelectItem value={v}>{v}</SelectItem>}
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </UiSelect>
  );
}

export function TextField({ value, onChange, placeholder }) {
  return <Input value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, rows = 4, placeholder }) {
  return <Textarea className="font-mono" value={value ?? ''} rows={rows} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

export function NumberInput({ value, onChange, min, max }) {
  const [text, setText] = useState(String(value ?? 0));
  const ref = useRef(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setText(String(value ?? 0));
  }, [value]);
  return (
    <Input
      ref={ref}
      type="number"
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
  const isHex = HEX_RE.test(value ?? '');
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={isHex ? value : '#5eb131'}
        onChange={e => onChange(e.target.value)}
        className="border-input h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        aria-label="Color"
      />
      <Input className="font-mono" value={value ?? ''} placeholder={emptyHint ?? '#rrggbb'} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export function EmojiInput({ value, onChange }) {
  return <Input className="w-28" value={value ?? ''} placeholder="💡 or <:name:id>" onChange={e => onChange(e.target.value)} />;
}

/** Tag input for Discord ID lists. Invalid (non-snowflake) ids are flagged red. */
export function TagInput({ value, onChange, idKind }) {
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
    <div className="border-input flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5">
      {items.map(id => {
        const bad = !SNOWFLAKE_RE.test(id);
        return (
          <span key={id}
            className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs border',
              bad ? 'bg-destructive/15 text-destructive border-destructive/40' : 'bg-primary/15 text-primary border-primary/30')}
            title={bad ? 'Not a valid Discord ID (17–20 digits)' : idKind}>
            {id}
            <button type="button" onClick={() => remove(id)} aria-label="Remove" className="cursor-pointer opacity-70 hover:opacity-100">
              <XIcon className="size-3" />
            </button>
          </span>
        );
      })}
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
          else if (e.key === 'Backspace' && draft === '' && items.length) remove(items[items.length - 1]);
        }}
        onBlur={() => commit(draft)}
        placeholder={items.length ? '' : 'ID + Enter'}
        className="text-foreground placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}
