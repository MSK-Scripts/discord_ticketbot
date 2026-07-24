// Form/File toggle for the config editor, styled as a small segmented control.

import { LayoutListIcon, FileCodeIcon } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useT } from '../i18n.jsx';

const ITEMS = [
  { id: 'form', labelKey: 'config.modeForm', Icon: LayoutListIcon },
  { id: 'file', labelKey: 'config.modeFile', Icon: FileCodeIcon },
];

export default function ModeSwitch({ value, onChange }) {
  const t = useT();
  return (
    <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
      {ITEMS.map(({ id, labelKey, Icon }) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
            value === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}>
          <Icon className="size-3.5" /> {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
