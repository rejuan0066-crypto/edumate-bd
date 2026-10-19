import * as React from "react";
import { useBijoy } from "@/contexts/BijoyContext";
import { cn } from "@/lib/utils";
import {
  isHistoryEligible,
  historyKey,
  safeListId,
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
  /** Explicit suggestions array to display in the datalist (e.g. shared from central database) */
  suggestions?: string[];
  /** Custom history key if name/id are absent or to isolate per field */
  customHistoryKey?: string;
  /** Enforce input language: 'en' (English only, auto-convert digits), 'bn' (Bangla, auto-convert digits), 'auto' (detect) */
  langType?: InputLangType;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onBlur, list, name, id, autoComplete, placeholder, history = true, suggestions, customHistoryKey, langType, ...props }, ref) => {
    const { bijoyEnabled } = useBijoy();
    const effectiveLang = React.useMemo(() => {
      return detectInputLang({ type, name, id, placeholder, langType });
    }, [type, name, id, placeholder, langType]);

    const finalKey = React.useMemo(() => {
      return historyKey(name, id, placeholder, customHistoryKey);
    }, [name, id, placeholder, customHistoryKey]);

    const eligible = history && isHistoryEligible(type, name, id, autoComplete, placeholder);
    const hasExplicitSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
    const shouldProvideDatalist = (eligible || hasExplicitSuggestions) && !list;

    const listId = React.useMemo(() => {
      if (!shouldProvideDatalist || list) return list;
      return safeListId(name, id, customHistoryKey || placeholder);
    }, [shouldProvideDatalist, list, name, id, customHistoryKey, placeholder]);

    const [items, setItems] = React.useState<string[]>([]);

    React.useEffect(() => {
      if (!eligible || list) return;
      setItems(loadHistory(finalKey));
    }, [eligible, list, finalKey]);

    // Merge shared suggestions and local per-user history
    const allSuggestions = React.useMemo(() => {
      const combined = [...(suggestions || []), ...items];
      const seen = new Set<string>();
      return combined.filter((v) => {
        const trimmed = (v ?? '').toString().trim();
        if (!trimmed || seen.has(trimmed)) return false;
        seen.add(trimmed);
        return true;
      });
    }, [suggestions, items]);

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
        pushHistory(finalKey, e.target.value);
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
              "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-xs ring-offset-background transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
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
        {shouldProvideDatalist && allSuggestions.length > 0 && (
          <datalist id={listId}>
            {allSuggestions.map((v) => (
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
