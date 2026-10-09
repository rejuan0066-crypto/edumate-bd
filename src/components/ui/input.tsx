import * as React from "react";
import { useBijoy } from "@/contexts/BijoyContext";
import { cn } from "@/lib/utils";
import {
  isHistoryEligible,
  historyKey,
  loadHistory,
  pushHistory,
} from "@/lib/inputHistory";
import {
  detectInputLang,
  filterEnglishInput,
  filterBanglaInput,
  InputLangType,
} from "@/lib/inputLanguageFilter";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Set to false to disable input history suggestions for this field */
  history?: boolean;
  /** Enforce input language: 'en' (English only, auto-convert digits), 'bn' (Bangla, auto-convert digits), 'auto' (detect) */
  langType?: InputLangType;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onBlur, list, name, id, autoComplete, placeholder, history = true, langType, ...props }, ref) => {
    const { bijoyEnabled } = useBijoy();
    const effectiveLang = React.useMemo(() => {
      return detectInputLang({ type, name, id, placeholder, langType });
    }, [type, name, id, placeholder, langType]);

    const eligible = history && isHistoryEligible(type, name, id, autoComplete, placeholder);
    const listId = React.useMemo(() => {
      if (!eligible || list) return list;
      return `ih-${(name || id || placeholder || 'field').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }, [eligible, list, name, id, placeholder]);

    const [items, setItems] = React.useState<string[]>([]);

    React.useEffect(() => {
      if (!eligible || list) return;
      setItems(loadHistory(historyKey(name, id, placeholder)));
    }, [eligible, list, name, id, placeholder]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const prevVal = el.value;
      const prevStart = el.selectionStart;
      const prevEnd = el.selectionEnd;

      if (effectiveLang === 'en') {
        const filtered = filterEnglishInput(prevVal);
        if (filtered !== prevVal) {
          el.value = filtered;
          if (prevStart !== null && prevEnd !== null && prevVal.length === filtered.length) {
            try { el.setSelectionRange(prevStart, prevEnd); } catch {}
          }
        }
      } else if (effectiveLang === 'bn') {
        const filtered = filterBanglaInput(prevVal);
        if (filtered !== prevVal) {
          el.value = filtered;
          if (prevStart !== null && prevEnd !== null && prevVal.length === filtered.length) {
            try { el.setSelectionRange(prevStart, prevEnd); } catch {}
          }
        }
      }

      if (type === 'number') {
        if (el.value === '') {
          onChange?.(e);
          return;
        }
      }
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (eligible && !list) {
        pushHistory(historyKey(name, id, placeholder), e.target.value);
      }
      onBlur?.(e);
    };

    return (
      <>
      <div className="relative w-full">
        <input
          data-bijoy={effectiveLang === 'en' ? 'false' : (bijoyEnabled ? 'true' : 'false')}
          data-lang={effectiveLang}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          name={name}
          id={id}
          placeholder={placeholder}
          autoComplete={autoComplete}
          list={listId}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
      </div>
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
