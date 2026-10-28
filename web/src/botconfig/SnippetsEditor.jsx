// Composite editor for snippets.jsonc → snippets[]. Each snippet has
// name/description/content plus an optional embed (title + color, or null).

import { CaretRight, Plus, Trash } from '@/components/icons.jsx';
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
          <div key={i} className="relative">
          <details className="group rounded-lg border bg-card shadow-card" open={i === 0}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 py-2.5 font-semibold hover:bg-muted/60 [&::-webkit-details-marker]:hidden pr-14">
              <span className="flex min-w-0 items-center gap-2.5">
                <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90" />
                <span className="truncate">{name}</span>
              </span>
            </summary>
            <div className="flex flex-col gap-5 border-t px-4 pt-4 pb-5">
              <FormRenderer model={model} fields={snippetFields(i)} onEdit={edit} issues={[]} />
              <div className="grid gap-4 border-t pt-4">
                <Toggle
                  checked={hasEmbed}
                  onChange={on => edit(['snippets', i, 'embed'], on ? { title: '', color: '#5865F2' } : null)}
                  label="Send as embed"
                />
                {hasEmbed && (
                  <div>
                    <FormRenderer model={model} fields={embedFields(i)} onEdit={edit} issues={[]} />
                  </div>
                )}
              </div>
            </div>
          </details>
          <button type="button" className="tap-target absolute top-1.5 right-2 inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-danger"
            onClick={() => remove(['snippets'], i)} aria-label={`Remove snippet: ${name}`} title="Remove snippet">
            <Trash className="size-5" />
          </button>
        </div>
        );
      })}

      <Button type="button" variant="outline" className="justify-center"
        onClick={() => append(['snippets'], DEFAULT_SNIPPET)}><Plus /> Add snippet</Button>
    </div>
  );
}
