// Top-level form container for one config file. Parses the shared `content`
// string, wires the comment-preserving edit helpers, and renders the right form:
// config.jsonc → schema sections (+ ticketTypes composite),
// snippets.jsonc → SnippetsEditor. (.env is handled by EnvEditor separately.)

import { CONFIG_SCHEMA } from './schema.js';
import { safeParse, editValue, appendArrayItem, removeArrayItem } from './jsoncEdit.js';
import FormRenderer from './FormRenderer.jsx';
import TicketTypesEditor from './TicketTypesEditor.jsx';
import SnippetsEditor from './SnippetsEditor.jsx';
import { CaretRight } from '@/components/icons.jsx';
import { Note } from '../ui.jsx';

export default function ConfigForm({ file, content, onContentChange, issues, localeOptions }) {
  const model = safeParse(content);

  // Comment-preserving edit callbacks bound to the current content string.
  const edit = (path, value) => onContentChange(editValue(content, path, value));
  const append = (arrayPath, item) => onContentChange(appendArrayItem(content, arrayPath, item));
  const remove = (arrayPath, index) => onContentChange(removeArrayItem(content, arrayPath, index));

  if (model === undefined || typeof model !== 'object' || model === null) {
    return (
      <Note tone="danger">
        <p>This file has syntax errors and cannot be shown as a form. Please fix it in file mode.</p>
      </Note>
    );
  }

  if (file === 'snippets') {
    return <SnippetsEditor model={model} edit={edit} append={append} remove={remove} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {CONFIG_SCHEMA.map((section, idx) => (
        <details key={section.id} className="group rounded-lg border bg-card shadow-card" open={idx === 0}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 py-2.5 font-semibold hover:bg-muted/60 [&::-webkit-details-marker]:hidden font-display text-lead">
            <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90" />
            {section.title}
          </summary>
          <div className="flex flex-col gap-5 border-t px-4 pt-4 pb-5">
            {section.composite === 'ticketTypes' && (
              <TicketTypesEditor model={model} edit={edit} append={append} remove={remove} issues={issues} />
            )}
            {section.fields.length > 0 && (
              <FormRenderer model={model} fields={section.fields} onEdit={edit} issues={issues} localeOptions={localeOptions} />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
