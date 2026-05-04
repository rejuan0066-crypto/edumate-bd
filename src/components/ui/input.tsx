import * as React from "react";

import { cn } from "@/lib/utils";
import {
  isHistoryEligible,
  historyKey,
  loadHistory,
  pushHistory,
} from "@/lib/inputHistory";

interface InputProps extends React.ComponentProps<"input"> {
  /** Set to false to disable input history suggestions for this field */
  history?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onBlur, list, name, id, autoComplete, history = true, ...props }, ref) => {
    const eligible = history && isHistoryEligible(type, name, id, autoComplete);
    const listId = React.useMemo(() => {
      if (!eligible || list) return list;
      return `ih-${(name || id || 'field').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }, [eligible, list, name, id]);

    const [items, setItems] = React.useState<string[]>([]);

    React.useEffect(() => {
      if (!eligible || list) return;
      setItems(loadHistory(historyKey(name, id)));
    }, [eligible, list, name, id]);

    const handleChange = type === 'number' && onChange
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.value === '') {
            onChange(e);
            return;
          }
          onChange(e);
        }
      : onChange;

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (eligible && !list) {
        pushHistory(historyKey(name, id), e.target.value);
      }
      onBlur?.(e);
    };

    return (
      <>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          name={name}
          id={id}
          autoComplete={autoComplete}
          list={listId}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {eligible && !list && items.length > 0 && (
          <datalist id={listId}>
            {items.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
      </>
    );
  },
);
Input.displayName = "Input";

export { Input };
