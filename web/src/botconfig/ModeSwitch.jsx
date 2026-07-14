// Form/File toggle for the config editor, styled as a small segmented control.

import { LayoutListIcon, FileCodeIcon } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const ITEMS = [
  { id: 'form', label: 'Form', Icon: LayoutListIcon },
  { id: 'file', label: 'File', Icon: FileCodeIcon },
];

export default function ModeSwitch({ value, onChange }) {
  return (
    <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
      {ITEMS.map(({ id, label, Icon }) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
            value === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}>
          <Icon className="size-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}
