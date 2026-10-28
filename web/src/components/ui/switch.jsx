import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils.js';

// On and off differ in three ways, never colour alone: thumb position, fill
// and border. The thumb takes the label colour of the fill it sits on, so it
// keeps 4.5:1 with any accent; the border reaches 3:1 on the surface.
function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer tap-target inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-[1.5px] p-0.5 transition-colors duration-150',
        'data-[state=unchecked]:border-input data-[state=unchecked]:bg-muted',
        'data-[state=checked]:border-primary-text data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-5 rounded-full transition-transform duration-150',
          'data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted-foreground',
          'data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
