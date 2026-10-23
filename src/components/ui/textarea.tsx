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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (effectiveLang === 'en') {
      // Block typing non-ASCII characters directly (Bangla/Arabic keys)
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (/[^\x20-\x7E\r\n\t]/.test(e.key)) {
          e.preventDefault();
          return;
        }
      }
    }
    props.onKeyDown?.(e);
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (effectiveLang === 'en') {
      const inputEvent = e.nativeEvent as InputEvent;
      if (inputEvent?.data && /[^\x20-\x7E\r\n\t]/.test(inputEvent.data)) {
        e.preventDefault();
        return;
      }
    }
    props.onBeforeInput?.(e as any);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (effectiveLang === 'en') {
      const text = e.clipboardData.getData('text');
      if (text && /[^\x20-\x7E\r\n\t]/.test(text)) {
        e.preventDefault();
        const cleanText = filterEnglishInput(text);
        const target = e.currentTarget;
        const start = target.selectionStart ?? 0;
        const end = target.selectionEnd ?? 0;
        const val = target.value;
        const newVal = val.slice(0, start) + cleanText + val.slice(end);
        target.value = newVal;
        try { target.setSelectionRange(start + cleanText.length, start + cleanText.length); } catch {}
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        return;
      }
    }
    props.onPaste?.(e);
  };

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
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onPaste={handlePaste}
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
