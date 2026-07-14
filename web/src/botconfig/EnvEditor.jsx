// Structured .env editor. Non-secret fields are controlled directly by the shared
// `content` string. Secret fields are masked: if a value is already set the input
// stays empty with a "leave blank to keep" placeholder and only patches `content`
// once the user actually types a new value.

import { useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { ENV_SCHEMA } from './schema.js';
import { parseEnv, setEnvValue } from './envEdit.js';
import { validateBotEnv } from './validateConfig.js';
import { Field, TextField } from './inputs.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';

const PLACEHOLDER_RE = /^YOUR_.*_HERE$/;

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

  return (
    <div className="flex flex-col gap-4">
      {ENV_SCHEMA.map(f => {
        const label = f.label + (f.optional ? ' (optional)' : '');

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
      })}

      {warnings.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>
            {warnings.map((w, i) => <p key={i}>{w.message}</p>)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
