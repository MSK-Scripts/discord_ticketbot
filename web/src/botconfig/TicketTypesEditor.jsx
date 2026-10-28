// Composite editor for config.jsonc → ticketTypes[] (up to 25), each with a
// nested questions[] builder (up to 5). Scalar fields reuse FormRenderer by
// building a field list for the given array index.

import { CaretRight, Plus, Ticket, Trash } from '@/components/icons.jsx';
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
          <div key={i} className="relative">
          <details className="group rounded-lg border bg-card shadow-card" open={i === 0}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 py-2.5 font-semibold hover:bg-muted/60 [&::-webkit-details-marker]:hidden pr-14">
              <span className="flex min-w-0 items-center gap-2.5">
                <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90" />
                {tt.emoji ? <span aria-hidden="true">{tt.emoji}</span> : <Ticket className="size-5 shrink-0 text-muted-foreground" />}
                <span className="truncate">{name}</span>
              </span>
            </summary>
            <div className="flex flex-col gap-5 border-t px-4 pt-4 pb-5">
              <FormRenderer model={model} fields={typeFields(i)} onEdit={edit} issues={issues} />

              {asks && (
                <div className="grid gap-3 border-t pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold">Questions ({questions.length}/{MAX_QUESTIONS})</h4>
                    <Button type="button" variant="outline" size="sm" disabled={questions.length >= MAX_QUESTIONS}
                      onClick={() => append(['ticketTypes', i, 'questions'], DEFAULT_QUESTION)}><Plus /> Question</Button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {questions.map((_, qi) => (
                      <div key={qi} className="rounded-md border bg-muted/40 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-small text-muted-foreground">#{qi + 1}</span>
                          <button type="button" className="tap-target inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-danger"
                            onClick={() => remove(['ticketTypes', i, 'questions'], qi)} aria-label={`Remove question #${qi + 1}`} title="Remove question">
                            <Trash className="size-5" />
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
          <button type="button" className="tap-target absolute top-1.5 right-2 inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-danger"
            onClick={() => remove(['ticketTypes'], i)} aria-label={`Remove type: ${name}`} title="Remove type">
            <Trash className="size-5" />
          </button>
        </div>
        );
      })}

      <Button type="button" variant="outline" className="justify-center" disabled={types.length >= MAX_TYPES}
        onClick={() => append(['ticketTypes'], DEFAULT_TICKET_TYPE)}>
        <Plus /> Add ticket type ({types.length}/{MAX_TYPES})
      </Button>
    </div>
  );
}
