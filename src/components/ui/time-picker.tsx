import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface TimePickerProps {
  id?: string;
  name?: string;
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  displayFormat?: '12h' | '24h';
  disabled?: boolean;
  clearable?: boolean;
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i); // 0..23
const PERIODS = ['AM', 'PM'] as const;

interface ScrollColumnProps<T> {
  label: string;
  items: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}

function ScrollColumn<T extends number | string>({
  label,
  items,
  value,
  onChange,
  render,
}: ScrollColumnProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll selected item to center when opened or value changes
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const selectedEl = el.querySelector<HTMLButtonElement>('[data-selected="true"]');
    if (selectedEl) {
      const top = selectedEl.offsetTop - el.clientHeight / 2 + selectedEl.clientHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [value]);

  return (
    <div className="flex flex-1 flex-col items-center min-w-0">
      <div className="text-[11px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-wider">
        {label}
      </div>
      <div
        ref={containerRef}
        role="listbox"
        aria-label={label}
        className="h-[190px] w-full overflow-y-auto overscroll-contain id-preview-scroll rounded-xl border border-border/50 bg-muted/20 p-1 space-y-1"
      >
        {items.map((item) => {
          const isSelected = item === value;
          return (
            <button
              key={String(item)}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-selected={isSelected}
              onClick={() => onChange(item)}
              className={cn(
                "h-8 w-full rounded-lg text-xs font-semibold tabular-nums transition-all flex items-center justify-center",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm font-bold scale-[1.02]"
                  : "text-foreground/75 hover:bg-primary/10 hover:text-primary"
              )}
            >
              {render(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TimePicker = ({
  id,
  name,
  value,
  onChange,
  className,
  placeholder = "সময়",
  displayFormat = '12h',
  disabled = false,
  clearable = false,
}: TimePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [h24, setH24] = React.useState<number>(0);
  const [minute, setMinute] = React.useState<number>(0);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!Number.isNaN(h)) setH24(Math.min(23, Math.max(0, h)));
      if (!Number.isNaN(m)) setMinute(Math.min(59, Math.max(0, m)));
    }
  }, [value, open]);

  const is24 = displayFormat === '24h';
  const period: typeof PERIODS[number] = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;

  const setHour = (val: number) => {
    if (is24) {
      setH24(val);
    } else {
      const newH = period === 'AM' ? (val % 12) : (val % 12) + 12;
      setH24(newH);
    }
  };

  const setPeriod = (p: typeof PERIODS[number]) => {
    if (p === 'AM' && h24 >= 12) setH24(h24 - 12);
    if (p === 'PM' && h24 < 12) setH24(h24 + 12);
  };

  const fmt = (h: number, m: number) => {
    if (is24) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${p}`;
  };

  const formatDisplay = (val: string) => {
    if (!val) return '';
    const [h, m] = val.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    return fmt(h, m);
  };

  const handleDone = () => {
    onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    setH24(now.getHours());
    setMinute(now.getMinutes());
  };

  const trigger = (
    <button
      id={id}
      name={name}
      type="button"
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 h-10 w-full rounded-2xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all duration-300",
        "hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-muted-foreground",
        className
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Clock className="h-3.5 w-3.5" />
      </span>
      <span className={cn("flex-1 text-left truncate tabular-nums", value && "font-medium")}>
        {value ? formatDisplay(value) : placeholder}
      </span>
      {clearable && value && !disabled && (
        <span
          role="button"
          tabIndex={0}
          aria-label="সময় মুছুন"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );

  const panel = (
    <div className="w-full">
      {/* Live preview header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60 bg-muted/30">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            নির্বাচিত সময়
          </p>
          <p className="text-xl font-bold tabular-nums text-foreground tracking-tight leading-none">
            {fmt(h24, minute)}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNow}
          className="h-7 shrink-0 rounded-full px-3 text-[11px] font-semibold"
        >
          এখন
        </Button>
      </div>

      {/* AM/PM toggle */}
      {!is24 && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
            role="group"
            aria-label="AM বা PM নির্বাচন"
          >
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                aria-pressed={period === item}
                className={cn(
                  "h-8 rounded-lg text-xs font-bold transition-all",
                  period === item
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Columns: Hour & Minute */}
      <div className="flex items-stretch gap-2.5 px-4 py-3">
        <ScrollColumn
          label="ঘণ্টা"
          items={is24 ? HOURS_24 : HOURS_12}
          value={is24 ? h24 : hour12}
          onChange={setHour}
          render={(v) => (is24 ? String(v).padStart(2, '0') : String(v))}
        />
        <ScrollColumn
          label="মিনিট"
          items={MINUTES}
          value={minute}
          onChange={setMinute}
          render={(v) => String(v).padStart(2, '0')}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-border/50">
        {clearable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { onChange(''); setOpen(false); }}
            className="h-9 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <X className="mr-1 h-3.5 w-3.5" /> মুছুন
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleDone}
          className="h-9 flex-1 rounded-xl text-xs font-bold shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          সম্পন্ন
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[320px] gap-0 overflow-hidden rounded-[24px] border-0 p-0 shadow-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">সময় নির্বাচন</DialogTitle>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[260px] overflow-hidden rounded-[24px] border-0 bg-popover p-0 shadow-2xl"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
};

export { TimePicker };
