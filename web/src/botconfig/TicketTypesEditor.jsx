// Composite editor for config.jsonc → ticketTypes[] (up to 25), each with a
// nested questions[] builder (up to 5). Scalar fields reuse FormRenderer by
// building a field list for the given array index.

import { PlusIcon, Trash2Icon } from 'lucide-react';
import { PRIORITY_OPTIONS, QUESTION_STYLE_OPTIONS, DEFAULT_TICKET_TYPE, DEFAULT_QUESTION } from './schema.js';
import { getAtPath } from './jsoncEdit.js';
import FormRenderer from './FormRenderer.jsx';
import { Button } from '@/components/ui/button.jsx';

const MAX_TYPES = 25;
const MAX_QUESTIONS = 5;

function typeFields(i) {
  const b = (k) => ['ticketTypes', i, k];
  return [
    { path: b('codeName'), kind: 'text', label: 'Code name', help: 'Lowercase, used internally.' },
    { path: b('name'), kind: 'text', label: 'Display name' },
    { path: b('description'), kind: 'text', label: 'Description' },
    { path: b('emoji'), kind: 'emoji', label: 'Emoji' },
    { path: b('color'), kind: 'color', label: 'Color' },
    { path: b('categoryId'), kind: 'text', idKind: 'category', label: 'Category ID' },
    { path: b('priority'), kind: 'select', options: PRIORITY_OPTIONS, label: 'Start priority' },
    { path: b('ticketNameOption'), kind: 'text', label: 'Channel name template', help: 'USERNAME, USERID, TICKETCOUNT or empty for default.' },
    { path: b('customDescription'), kind: 'textarea', label: 'Custom opening message' },
    { path: b('cantAccess'), kind: 'idList', idKind: 'role', label: 'Roles that cannot open this type' },
    { path: b('staffRoles'), kind: 'idList', idKind: 'role', label: 'Type-specific staff roles' },
    { path: b('askQuestions'), kind: 'toggle', label: 'Ask questions on open' },
  ];
}

function questionFields(ti, qi) {
  const b = (k) => ['ticketTypes', ti, 'questions', qi, k];
  return [
    { path: b('label'), kind: 'text', label: 'Label' },
    { path: b('placeholder'), kind: 'text', label: 'Placeholder' },
    { path: b('style'), kind: 'select', options: QUESTION_STYLE_OPTIONS, label: 'Style' },
    { path: b('maxLength'), kind: 'number', min: 1, label: 'Max length' },
  ];
}

export default function TicketTypesEditor({ model, edit, append, remove, issues }) {
  const types = getAtPath(model, ['ticketTypes']) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {types.map((t, i) => {
        const tt = t ?? {};
        const name = tt.name || tt.codeName || `#${i + 1}`;
        const questions = Array.isArray(tt.questions) ? tt.questions : [];
        const asks = Boolean(tt.askQuestions);
        return (
          <details key={i} className="group bg-background rounded-lg border" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground transition-transform group-open:rotate-90">▸</span>
                {tt.emoji || '🎫'} {name}
              </span>
              <button type="button" className="text-muted-foreground hover:text-destructive cursor-pointer"
                onClick={e => { e.preventDefault(); remove(['ticketTypes'], i); }} title="Remove type">
                <Trash2Icon className="size-4" />
              </button>
            </summary>
            <div className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
              <FormRenderer model={model} fields={typeFields(i)} onEdit={edit} issues={issues} />

              {asks && (
                <div className="border-t pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-sm">Questions ({questions.length}/{MAX_QUESTIONS})</strong>
                    <Button type="button" variant="outline" size="sm" disabled={questions.length >= MAX_QUESTIONS}
                      onClick={() => append(['ticketTypes', i, 'questions'], DEFAULT_QUESTION)}><PlusIcon /> Question</Button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {questions.map((_, qi) => (
                      <div key={qi} className="bg-card rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-mono text-xs">#{qi + 1}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => remove(['ticketTypes', i, 'questions'], qi)} title="Remove question">
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                        <FormRenderer model={model} fields={questionFields(i, qi)} onEdit={edit} issues={issues} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        );
      })}

      <Button type="button" variant="outline" className="justify-center" disabled={types.length >= MAX_TYPES}
        onClick={() => append(['ticketTypes'], DEFAULT_TICKET_TYPE)}>
        <PlusIcon /> Add ticket type ({types.length}/{MAX_TYPES})
      </Button>
    </div>
  );
}
