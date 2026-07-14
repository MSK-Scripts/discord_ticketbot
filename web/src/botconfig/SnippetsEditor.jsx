// Composite editor for snippets.jsonc → snippets[]. Each snippet has
// name/description/content plus an optional embed (title + color, or null).

import { PlusIcon, Trash2Icon } from 'lucide-react';
import { DEFAULT_SNIPPET } from './schema.js';
import { getAtPath } from './jsoncEdit.js';
import FormRenderer from './FormRenderer.jsx';
import { Toggle } from './inputs.jsx';
import { Button } from '@/components/ui/button.jsx';

function snippetFields(i) {
  const b = (k) => ['snippets', i, k];
  return [
    { path: b('name'), kind: 'text', label: 'Name', help: 'Used in /snippet send <name> (lowercase, no spaces).' },
    { path: b('description'), kind: 'text', label: 'Description' },
    { path: b('content'), kind: 'textarea', label: 'Content', help: 'Placeholders: {user}, {staff}, {type}, {priority}.' },
  ];
}

function embedFields(i) {
  const b = (k) => ['snippets', i, 'embed', k];
  return [
    { path: b('title'), kind: 'text', label: 'Embed title' },
    { path: b('color'), kind: 'color', label: 'Embed color' },
  ];
}

export default function SnippetsEditor({ model, edit, append, remove }) {
  const snippets = getAtPath(model, ['snippets']) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {snippets.map((s, i) => {
        const ss = s ?? {};
        const name = ss.name || `#${i + 1}`;
        const hasEmbed = ss.embed != null;
        return (
          <details key={i} className="group bg-background rounded-lg border" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground transition-transform group-open:rotate-90">▸</span>
                {name}
              </span>
              <button type="button" className="text-muted-foreground hover:text-destructive cursor-pointer"
                onClick={e => { e.preventDefault(); remove(['snippets'], i); }} title="Remove snippet">
                <Trash2Icon className="size-4" />
              </button>
            </summary>
            <div className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
              <FormRenderer model={model} fields={snippetFields(i)} onEdit={edit} issues={[]} />
              <div className="border-t pt-3">
                <Toggle
                  checked={hasEmbed}
                  onChange={on => edit(['snippets', i, 'embed'], on ? { title: '', color: '#5865F2' } : null)}
                  label="Send as embed"
                />
                {hasEmbed && (
                  <div className="mt-3">
                    <FormRenderer model={model} fields={embedFields(i)} onEdit={edit} issues={[]} />
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}

      <Button type="button" variant="outline" className="justify-center"
        onClick={() => append(['snippets'], DEFAULT_SNIPPET)}><PlusIcon /> Add snippet</Button>
    </div>
  );
}
