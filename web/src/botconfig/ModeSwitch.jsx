// Form/File toggle for the config editor: a segmented group of toggle buttons
// with aria-pressed, the same shape as the theme switch.

import { FileCode, ListBullets } from '@/components/icons.jsx';
import { cn } from '@/lib/utils.js';
import { useT } from '../i18n.jsx';

const ITEMS = [
  { id: 'form', labelKey: 'config.modeForm', Icon: ListBullets },
  { id: 'file', labelKey: 'config.modeFile', Icon: FileCode },
];

export default function ModeSwitch({ value, onChange }) {
  const t = useT();
  return (
    <div role="group" aria-label={t('config.viewMode')} className="inline-flex overflow-hidden rounded-md border-[1.5px] border-input">
      {ITEMS.map(({ id, labelKey, Icon }, i) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id}
          className={cn(
            'inline-flex min-h-11 cursor-pointer items-center gap-2 px-4 text-small font-semibold transition-colors duration-150 focus-visible:outline-offset-[-3px]',
            i > 0 && 'border-l-[1.5px] border-input',
            'text-foreground hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background',
          )}>
          <Icon className="size-4" /> {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
