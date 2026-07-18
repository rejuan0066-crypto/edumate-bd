import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

// Context to expose current value + setter so triggers can toggle-close on re-click
const TabsToggleContext = React.createContext<{
  value: string;
  setValue: (v: string) => void;
} | null>(null);

// Wrapper that supports toggle behavior (click active tab to deselect)
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, onValueChange, defaultValue, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState<string>(
    typeof defaultValue === 'string' ? defaultValue : ''
  );
  const currentValue = value !== undefined ? value : internalValue;

  const setValue = React.useCallback((newValue: string) => {
    if (value === undefined) setInternalValue(newValue);
    onValueChange?.(newValue);
  }, [value, onValueChange]);

  return (
    <TabsToggleContext.Provider value={{ value: currentValue, setValue }}>
      <TabsPrimitive.Root
        ref={ref}
        value={currentValue}
        onValueChange={setValue}
        {...props}
      />
    </TabsToggleContext.Provider>
  );
}) as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & React.RefAttributes<React.ElementRef<typeof TabsPrimitive.Root>>
>;
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1.5 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, onMouseDown, value: triggerValue, ...props }, ref) => {
  const ctx = React.useContext(TabsToggleContext);
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseDown?.(e);
    if (e.defaultPrevented) return;
    // If clicking the already-active trigger, close it (Radix won't re-fire onValueChange)
    if (ctx && triggerValue && ctx.value === triggerValue) {
      e.preventDefault();
      ctx.setValue('');
    }
  };
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={triggerValue as string}
      onMouseDown={handleMouseDown}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-base font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
