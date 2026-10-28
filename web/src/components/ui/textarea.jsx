import { cn } from '@/lib/utils.js';
import { fieldClassName } from './input.jsx';

function Textarea({ className, ...props }) {
  return <textarea data-slot="textarea" className={cn(fieldClassName, 'flex min-h-24', className)} {...props} />;
}

export { Textarea };
