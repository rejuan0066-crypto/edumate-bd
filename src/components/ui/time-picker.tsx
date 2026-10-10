import * as React from "react";
import { Clock, X, ChevronUp, ChevronDown } from "lucide-react";
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
  /** Show the clear (mute) action inside the panel or trigger */
  clearable?: boolean;
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i); // 0..23
const PERIODS = ['AM', 'PM'] as const;

const ITEM_H = 44; // px height per wheel item
const VISIBLE = 5;

/** A single scrollable wheel column with snap + center highlight. */
function Wheel<T>({
  items,
  value,
  onChange,
  render,
  label,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
  label: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scrollTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = React.useRef(false);
  const idx = Math.max(0, items.findIndex((i) => i === value));

  const snapTo = (top: number) => {
    const el = ref.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTop = top;
    requestAnimationFrame(() => { programmatic.current = false; });
  };

  // Scroll to selected item whenever value changes externally
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 2) snapTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleScroll = () => {
    if (programmatic.current) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const clamped = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      const target = clamped * ITEM_H;
      if (Math.abs(el.scrollTop - target) > 1) snapTo(target);
      if (items[clamped] !== value) onChange(items[clamped]);
    }, 100);
  };

  const commitVisibleItem = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    const el = ref.current;
    if (!el) return;
    const nextIndex = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
    snapTo(nextIndex * ITEM_H);
    if (items[nextIndex] !== value) onChange(items[nextIndex]);
  };

  React.useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  // Discrete mouse-wheel
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      acc += e.deltaY;
      const threshold = 18;
      if (Math.abs(acc) >= threshold) {
        const dir = acc > 0 ? 1 : -1;
        acc = 0;
        const next = Math.min(items.length - 1, Math.max(0, idx + dir));
        if (next !== idx) {
          snapTo(next * ITEM_H);
          onChange(items[next]);
        }
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, items, onChange]);

  // Keyboard support
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const next = Math.min(items.length - 1, Math.max(0, idx + (e.key === 'ArrowDown' ? 1 : -1)));
    if (next !== idx) { snapTo(next * ITEM_H); onChange(items[next]); }
  };

  const stepUp = () => {
    const next = Math.max(0, idx - 1);
    snapTo(next * ITEM_H);
    onChange(items[next]);
  };

  const stepDown = () => {
    const next = Math.min(items.length - 1, idx + 1);
    snapTo(next * ITEM_H);
    onChange(items[next]);
  };

  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      {/* Column label */}
      <p className="text-[10px] font-bold text-muted-foreground/70 mb-1 uppercase tracking-widest">{label}</p>

      {/* Up arrow */}
      <button
        type="button"
        onClick={stepUp}
        disabled={idx === 0}
        className="flex h-7 w-full items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed rounded-xl"
        aria-label={`${label} বাড়ান`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>

      {/* Wheel */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: ITEM_H * VISIBLE }}>
        {/* Center highlight band */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 rounded-xl"
          style={{
            top: ITEM_H * 2,
            height: ITEM_H,
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--primary)/0.06))',
            boxShadow: 'inset 0 0 0 1.5px hsl(var(--primary)/0.25)',
          }}
        />
        {/* Top fade */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20"
          style={{ height: ITEM_H * 2, background: 'linear-gradient(to bottom, hsl(var(--popover)) 30%, transparent)' }}
        />
        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
          style={{ height: ITEM_H * 2, background: 'linear-gradient(to top, hsl(var(--popover)) 30%, transparent)' }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          onTouchEnd={commitVisibleItem}
          onPointerUp={commitVisibleItem}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="listbox"
          aria-label={label}
          className="h-full overflow-y-auto snap-y snap-mandatory id-preview-scroll overscroll-contain cursor-ns-resize outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl touch-pan-y"
          style={{ scrollPaddingTop: ITEM_H * 2, touchAction: 'pan-y' }}
        >
          {/* top spacer */}
          <div style={{ height: ITEM_H * 2 }} />
          {items.map((it, i) => {
            const isSelected = it === value;
            const dist = Math.abs(i - idx);
            return (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { snapTo(i * ITEM_H); onChange(it); }}
                className={cn(
                  "w-full snap-center flex items-center justify-center tabular-nums transition-all duration-150 font-semibold",
                  isSelected
                    ? "text-primary text-xl scale-110"
                    : dist === 1
                      ? "text-foreground/55 text-base scale-100"
                      : "text-muted-foreground/30 text-sm scale-95"
                )}
                style={{ height: ITEM_H }}
              >
                {render(it)}
              </button>
            );
          })}
          {/* bottom spacer */}
          <div style={{ height: ITEM_H * 2 }} />
        </div>
      </div>

      {/* Down arrow */}
      <button
        type="button"
        onClick={stepDown}
        disabled={idx === items.length - 1}
        className="flex h-7 w-full items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed rounded-xl"
        aria-label={`${label} কমান`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
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
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
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
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">নির্বাচিত সময়</p>
          <p className="text-2xl font-bold tabular-nums text-foreground tracking-tight leading-none">
            {fmt(h24, minute)}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNow}
          className="h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold"
        >
          এখন
        </Button>
      </div>

      {/* AM/PM toggle */}
      {!is24 && (
        <div className="px-4 pt-4 pb-2">
          <div
            className="relative grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/40 p-1"
            role="group"
            aria-label="AM বা PM নির্বাচন"
          >
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-primary shadow-md transition-all duration-200 ease-in-out"
              style={{ left: period === 'AM' ? '4px' : 'calc(50%)' }}
            />
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                aria-pressed={period === item}
                className={cn(
                  "relative z-10 h-9 rounded-xl text-sm font-bold transition-all duration-200",
                  period === item
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Separator line */}
      <div className="flex items-center px-4 pt-2 pb-0.5">
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Wheel columns */}
      <div className="flex items-stretch gap-2 px-4 pt-2 pb-2">
        {/* Colon separator (visual) */}
        <Wheel
          label={"ঘণ্টা"}
          items={is24 ? HOURS_24 : HOURS_12}
          value={is24 ? h24 : hour12}
          onChange={setHour}
          render={(v) => String(is24 ? v : v).padStart(2, '0')}
        />
        {/* Center colon */}
        <div className="flex items-center justify-center text-3xl font-bold text-muted-foreground/40 pb-1 shrink-0">
          :
        </div>
        <Wheel
          label={"মিনিট"}
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
            className="h-10 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <X className="mr-1 h-3.5 w-3.5" /> মুছুন
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleDone}
          className="h-10 flex-1 rounded-xl text-sm font-bold shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98] bg-primary hover:bg-primary/90"
        >
          ✓ সম্পন্ন
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden">
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
        className="w-[280px] overflow-hidden rounded-[28px] border-0 bg-popover p-0 shadow-2xl"
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
