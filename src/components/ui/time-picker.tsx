import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  displayFormat?: '12h' | '24h';
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i); // 0..23
const PERIODS = ['AM', 'PM'] as const;

const ITEM_H = 36; // px height per wheel item

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
    }, 120);
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</p>
      <div className="relative" style={{ height: ITEM_H * 5 }}>
        {/* center highlight band */}
        <div
          className="pointer-events-none absolute inset-x-1 rounded-xl bg-primary/10 border border-primary/20"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hidden overscroll-contain"
          style={{ scrollPaddingTop: ITEM_H * 2, touchAction: 'pan-y' }}
        >
          {/* top spacer */}
          <div style={{ height: ITEM_H * 2 }} />
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { snapTo(i * ITEM_H); onChange(it); }}
              className={cn(
                "w-full snap-center flex items-center justify-center text-sm transition-all duration-150",
                it === value
                  ? "text-primary font-bold scale-110"
                  : "text-muted-foreground/60 hover:text-foreground"
              )}
              style={{ height: ITEM_H }}
            >
              {render(it)}
            </button>
          ))}
          {/* bottom spacer */}
          <div style={{ height: ITEM_H * 2 }} />
        </div>
      </div>
    </div>
  );
}

const TimePicker = ({ value, onChange, className, placeholder = "সময়", displayFormat = '12h' }: TimePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [h24, setH24] = React.useState<number>(0);
  const [minute, setMinute] = React.useState<number>(0);

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setH24(h);
      setMinute(m);
    }
  }, [value, open]);

  const is24 = displayFormat === '24h';
  const period: typeof PERIODS[number] = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;

  const setHour = (val: number) => {
    if (is24) {
      setH24(val);
    } else {
      // val is 1..12
      const newH = period === 'AM' ? (val % 12) : (val % 12) + 12;
      setH24(newH);
    }
  };

  const setPeriod = (p: typeof PERIODS[number]) => {
    if (p === 'AM' && h24 >= 12) setH24(h24 - 12);
    if (p === 'PM' && h24 < 12) setH24(h24 + 12);
  };

  const formatDisplay = (val: string) => {
    if (!val) return '';
    const [h, m] = val.split(':').map(Number);
    if (is24) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${p}`;
  };

  const handleDone = () => {
    onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all duration-300",
            "hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          <span className="flex-1 text-left truncate">
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-0 border-0 shadow-2xl rounded-[28px] backdrop-blur-xl bg-background/95 overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <div className="flex items-stretch gap-1 px-4 pt-4">
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

        {/* Done Button */}
        <div className="px-4 pb-4 pt-3">
          <Button
            size="sm"
            onClick={handleDone}
            className="w-full rounded-xl h-9 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            সম্পন্ন
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { TimePicker };
