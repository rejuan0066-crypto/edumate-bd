import * as React from "react";
import { useBijoy } from "@/contexts/BijoyContext";
import { cn } from "@/lib/utils";
import {
  detectInputLang,
  filterEnglishInput,
  filterBanglaInput,
  InputLangType,
} from "@/lib/inputLanguageFilter";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  langType?: InputLangType;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, name, id, placeholder, langType, onChange, ...props }, ref) => {
  const { bijoyEnabled } = useBijoy();
  const effectiveLang = React.useMemo(() => {
    return detectInputLang({ name, id, placeholder, langType });
  }, [name, id, placeholder, langType]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    onChange?.(e);
  };

  return (
    <div className="relative w-full">
      <textarea
        data-bijoy={effectiveLang === 'en' ? 'false' : (bijoyEnabled ? 'true' : 'false')}
        data-lang={effectiveLang}
        name={name}
        id={id}
        placeholder={placeholder}
        onChange={handleChange}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
