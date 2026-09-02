import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  displayFormat?: '12h' | '24h';
  disabled?: boolean;
  /** Show the clear (mute) action inside the panel */
  clearable?: boolean;
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i); // 0..23
const PERIODS = ['AM', 'PM'] as const;

const ITEM_H = 40; // px height per wheel item
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
    el.scrollTop = top; // instant — avoids smooth-scroll event storms that fight the user
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
    if (programmatic.current) return; // ignore our own snap scrolls
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const clamped = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      const target = clamped * ITEM_H;
      if (Math.abs(el.scrollTop - target) > 1) snapTo(target);
      if (items[clamped] !== value) onChange(items[clamped]);
    }, 110);
  };

  // Discrete mouse-wheel: hover over the column and scroll moves one item per tick.
  // Native non-passive listener so we can preventDefault and avoid the page scrolling.
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

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-muted-foreground/80 mb-2 uppercase tracking-[0.14em]">{label}</p>
      <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
        {/* center highlight band */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/25"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />
        {/* top / bottom fade masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 z-10 bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 z-10 bg-gradient-to-t from-background to-transparent" />
        <div
          ref={ref}
          onScroll={handleScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="listbox"
          aria-label={label}
          className="h-full overflow-y-auto snap-y snap-mandatory id-preview-scroll overscroll-contain cursor-ns-resize outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl"
          style={{ scrollPaddingTop: ITEM_H * 2, touchAction: 'pan-y' }}
        >
          {/* top spacer */}
          <div style={{ height: ITEM_H * 2 }} />
          {items.map((it, i) => {
            const dist = Math.abs(i - idx);
            return (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={it === value}
                onClick={() => { snapTo(i * ITEM_H); onChange(it); }}
                className={cn(
                  "w-full snap-center flex items-center justify-center tabular-nums transition-all duration-200",
                  it === value
                    ? "text-primary font-bold text-lg"
                    : dist === 1
                      ? "text-foreground/60 text-sm"
                      : "text-muted-foreground/40 text-sm"
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
    </div>
  );
}

const TimePicker = ({ value, onChange, className, placeholder = "সময়", displayFormat = '12h', disabled = false, clearable = false }: TimePickerProps) => {
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
    </button>
  );

  const panel = (
    <div className="w-full">
      {/* live preview header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">নির্বাচিত সময়</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{fmt(h24, minute)}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNow}
          className="h-8 rounded-full px-3 text-[11px] font-semibold"
        >
          এখন
        </Button>
      </div>

      <div className="flex items-stretch gap-1.5 px-4 pt-4">
        <Wheel
          label={"ঘণ্টা"}
          items={is24 ? HOURS_24 : HOURS_12}
          value={is24 ? h24 : hour12}
          onChange={setHour}
          render={(v) => (is24 ? String(v).padStart(2, '0') : String(v))}
        />
        <Wheel
          label={"মিনিট"}
          items={MINUTES}
          value={minute}
          onChange={setMinute}
          render={(v) => String(v).padStart(2, '0')}
        />
        {!is24 && (
          <Wheel
            label={"AM/PM"}
            items={PERIODS as unknown as typeof PERIODS[number][]}
            value={period}
            onChange={setPeriod}
            render={(v) => v}
          />
        )}
      </div>

      <div className="flex items-center gap-2 px-4 pb-4 pt-3">
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
          className="h-10 flex-1 rounded-xl text-xs font-semibold shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98]"
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
        <DialogContent className="w-[88vw] max-w-[320px] gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden">
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
        className="w-[280px] overflow-hidden rounded-[28px] border-0 bg-background/95 p-0 shadow-2xl backdrop-blur-xl"
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
