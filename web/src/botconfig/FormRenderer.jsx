// Generic renderer: turns a list of field defs into inputs, reading each value
// from the parsed model at its JSONPath and reporting edits back via onEdit.

import { getAtPath } from './jsoncEdit.js';
import { Field, Toggle, Select, TextField, TextArea, NumberInput, ColorPicker, EmojiInput, TagInput } from './inputs.jsx';

const samePath = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The first error-severity message anchored at `path`, if any. */
export function issueFor(issues, path) {
  const hit = issues.find(i => i.path && samePath(i.path, path) && i.severity === 'error');
  return hit?.message;
}

export default function FormRenderer({ model, fields, onEdit, issues, localeOptions }) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map(f => {
        const raw = getAtPath(model, f.path);
        const error = issueFor(issues, f.path);
        const key = f.path.join('.');

        if (f.kind === 'toggle') {
          return <Toggle key={key} checked={Boolean(raw)} onChange={v => onEdit(f.path, v)} label={f.label} help={f.help} />;
        }

        const str = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
        // Some selects (bot/transcript language) list the locale files that
        // actually exist instead of a hardcoded set.
        const selectOptions = f.dynamicOptions === 'locales' && localeOptions?.length
          ? localeOptions
          : (f.options ?? []);

        return (
          <Field key={key} label={f.label} help={f.help} error={error}>
            {f.kind === 'select' && <Select value={str} onChange={v => onEdit(f.path, v)} options={selectOptions} />}
            {f.kind === 'text' && <TextField value={str} onChange={v => onEdit(f.path, v)} />}
            {f.kind === 'textarea' && <TextArea value={str} onChange={v => onEdit(f.path, v)} />}
            {f.kind === 'number' && (
              <NumberInput value={typeof raw === 'number' ? raw : Number(raw) || 0} onChange={v => onEdit(f.path, v)} min={f.min} max={f.max} />
            )}
            {f.kind === 'color' && <ColorPicker value={str} onChange={v => onEdit(f.path, v)} emptyHint="empty = mainColor" />}
            {f.kind === 'emoji' && <EmojiInput value={str} onChange={v => onEdit(f.path, v)} />}
            {f.kind === 'idList' && (
              <TagInput value={Array.isArray(raw) ? raw : []} onChange={v => onEdit(f.path, v)} idKind={f.idKind} />
            )}
          </Field>
        );
      })}
    </div>
  );
}
