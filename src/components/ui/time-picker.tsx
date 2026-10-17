import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface TimePickerProps {
  id?: string;
  name?: string;
  value?: string; // "HH:MM" 24h format, or 12h format e.g. "02:30 PM"
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  displayFormat?: '12h' | '24h';
  disabled?: boolean;
  clearable?: boolean;
}

export const normalizeTo24h = (val: string | null | undefined): string => {
  if (!val) return "";
  const str = String(val).trim();
  if (!str) return "";

  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3]?.toUpperCase();

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  if (str.includes("T")) {
    const timePart = str.split("T")[1];
    if (timePart) return timePart.slice(0, 5);
  }

  if (/^\d{2}:\d{2}/.test(str)) {
    return str.slice(0, 5);
  }

  return str;
};

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(({
  id,
  name,
  value,
  onChange,
  className,
  placeholder,
  displayFormat = '12h',
  disabled = false,
  clearable = false,
}, ref) => {
  const internalRef = React.useRef<HTMLInputElement | null>(null);

  const normalizedValue = React.useMemo(() => normalizeTo24h(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    if (internalRef.current) {
      internalRef.current.value = "";
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      if (typeof (e.currentTarget as any).showPicker === "function") {
        (e.currentTarget as any).showPicker();
      }
    } catch {}
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full group",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={(el) => {
          internalRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as any).current = el;
        }}
        type="time"
        step="60"
        id={id}
        name={name}
        value={normalizedValue}
        onChange={handleChange}
        onClick={handleClick}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "flex h-9 sm:h-10 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs sm:text-sm shadow-sm transition-all duration-200",
          "hover:border-primary/40 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
          clearable && normalizedValue && "pr-8",
          className
        )}
      />
      {clearable && normalizedValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear time"
          className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

TimePicker.displayName = "TimePicker";

export { TimePicker };
