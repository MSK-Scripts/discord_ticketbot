// Top-level form container for one config file. Parses the shared `content`
// string, wires the comment-preserving edit helpers, and renders the right form:
// config.jsonc → schema sections (+ ticketTypes composite),
// snippets.jsonc → SnippetsEditor. (.env is handled by EnvEditor separately.)

import { CONFIG_SCHEMA } from './schema.js';
import { safeParse, editValue, appendArrayItem, removeArrayItem } from './jsoncEdit.js';
import FormRenderer from './FormRenderer.jsx';
import TicketTypesEditor from './TicketTypesEditor.jsx';
import SnippetsEditor from './SnippetsEditor.jsx';

export default function ConfigForm({ file, content, onContentChange, issues, localeOptions }) {
  const model = safeParse(content);

  // Comment-preserving edit callbacks bound to the current content string.
  const edit = (path, value) => onContentChange(editValue(content, path, value));
  const append = (arrayPath, item) => onContentChange(appendArrayItem(content, arrayPath, item));
  const remove = (arrayPath, index) => onContentChange(removeArrayItem(content, arrayPath, index));

  if (model === undefined || typeof model !== 'object' || model === null) {
    return (
      <div className="text-destructive bg-destructive/10 border-destructive/30 rounded-lg border px-4 py-3 text-sm">
        This file has syntax errors and cannot be shown as a form. Please fix it in file mode.
      </div>
    );
  }

  if (file === 'snippets') {
    return <SnippetsEditor model={model} edit={edit} append={append} remove={remove} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {CONFIG_SCHEMA.map((section, idx) => (
        <details key={section.id} className="group bg-card rounded-lg border" open={idx === 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="text-muted-foreground transition-transform group-open:rotate-90">▸</span>
            {section.title}
          </summary>
          <div className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
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
