import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils.js';

function Tabs({ className, ...props }) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground focus-visible:ring-ring/50 inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
