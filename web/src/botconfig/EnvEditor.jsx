// Structured .env editor, grouped into sections like the config form.
//
// Three field kinds:
//   • plain   — controlled directly by the shared `content` string.
//   • secret  — masked: if a value is already set the input stays empty with a
//               "leave blank to keep" placeholder and only patches `content` once
//               the user actually types a new value.
//   • toggle  — a boolean written as the string "true"/"false".

import { useState } from 'react';
import { ENV_SCHEMA } from './schema.js';
import { parseEnv, setEnvValue } from './envEdit.js';
import { validateBotEnv } from './validateConfig.js';
import { Field, TextField, Toggle } from './inputs.jsx';
import { CaretRight } from '@/components/icons.jsx';
import { Note } from '../ui.jsx';

const PLACEHOLDER_RE = /^YOUR_.*_HERE$/;
// Same rule the bot uses (config.js truthy): what counts as "on" in a .env value.
const isTruthy = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());

export default function EnvEditor({ content, onChange }) {
  // Local drafts for secret fields (absence = untouched → keep existing value).
  const [drafts, setDrafts] = useState({});

  const env = parseEnv(content);
  const valueMap = new Map([...env].map(([k, v]) => [k, v.value]));
  const warnings = validateBotEnv(valueMap);

  const isSet = (key) => {
    const v = env.get(key)?.value?.trim() ?? '';
    return v !== '' && !PLACEHOLDER_RE.test(v);
  };

  const renderField = (f) => {
    const label = f.label + (f.optional ? ' (optional)' : '');

    if (f.kind === 'toggle') {
      return (
        <Toggle
          key={f.key}
          label={label}
          help={f.help}
          checked={isTruthy(env.get(f.key)?.value)}
          onChange={on => onChange(setEnvValue(content, f.key, on ? 'true' : 'false'))}
        />
      );
    }

    if (f.secret) {
      const touched = f.key in drafts;
      const keepHint = '•••• set — leave blank to keep';
      return (
        <Field key={f.key} label={label} help={f.help}>
          <TextField
            value={touched ? drafts[f.key] : ''}
            placeholder={!touched && isSet(f.key) ? keepHint : ''}
            onChange={v => {
              setDrafts(d => ({ ...d, [f.key]: v }));
              onChange(setEnvValue(content, f.key, v));
            }}
          />
        </Field>
      );
    }

    return (
      <Field key={f.key} label={label} help={f.help}>
        <TextField value={env.get(f.key)?.value ?? ''} onChange={v => onChange(setEnvValue(content, f.key, v))} />
      </Field>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {ENV_SCHEMA.map((section) => (
        <details key={section.id} className="group rounded-lg border bg-card shadow-card" open>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 py-2.5 font-semibold hover:bg-muted/60 [&::-webkit-details-marker]:hidden font-display text-lead">
            <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90" />
            {section.title}
          </summary>
          <div className="flex flex-col gap-5 border-t px-4 pt-4 pb-5">
            {section.help && <p className="max-w-[65ch] text-small text-muted-foreground">{section.help}</p>}
            {section.fields.map(renderField)}
          </div>
        </details>
      ))}

      {warnings.length > 0 && (
        <Note tone="warning">
          {warnings.map((w, i) => <p key={i}>{w.message}</p>)}
        </Note>
      )}
    </div>
  );
}
