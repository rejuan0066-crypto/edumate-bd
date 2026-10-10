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
  clearable?: boolean;
}

const PERIODS = ['AM', 'PM'] as const;

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
  const [h24, setH24] = React.useState<number>(9);
  const [minute, setMinute] = React.useState<number>(30);
  const [activeUnit, setActiveUnit] = React.useState<'hour' | 'minute'>('hour');
  const isMobile = useIsMobile();

  const hourRef = React.useRef<HTMLDivElement>(null);
  const minuteRef = React.useRef<HTMLDivElement>(null);
  const touchStartY = React.useRef<number | null>(null);

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

  const stepHour = React.useCallback((delta: number) => {
    if (is24) {
      setH24((prev) => (prev + delta + 24) % 24);
    } else {
      const current12 = h24 % 12 || 12;
      let next12 = current12 + delta;
      if (next12 > 12) next12 = 1;
      if (next12 < 1) next12 = 12;
      const newH = period === 'AM' ? (next12 % 12) : (next12 % 12) + 12;
      setH24(newH);
    }
  }, [is24, h24, period]);

  const stepMinute = React.useCallback((delta: number) => {
    setMinute((prev) => (prev + delta + 60) % 60);
  }, []);

  const setPeriod = (p: typeof PERIODS[number]) => {
    if (p === 'AM' && h24 >= 12) setH24(h24 - 12);
    if (p === 'PM' && h24 < 12) setH24(h24 + 12);
  };

  // Discrete mouse wheel on Hour box
  React.useEffect(() => {
    const el = hourRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stepHour(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stepHour]);

  // Discrete mouse wheel on Minute box
  React.useEffect(() => {
    const el = minuteRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stepMinute(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stepMinute]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent, type: 'hour' | 'minute') => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(diff) >= 20) {
      const dir = diff > 0 ? 1 : -1;
      if (type === 'hour') stepHour(dir);
      else stepMinute(dir);
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
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
    <div className="w-[280px] select-none p-4 space-y-3.5">
      {/* Top Header & Digital Display Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            সময় নির্ধারণ
          </span>
          <span className="text-xs font-bold text-primary tabular-nums">
            {fmt(h24, minute)}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNow}
          className="h-7 rounded-full px-3 text-[11px] font-semibold"
        >
          এখন
        </Button>
      </div>

      {/* Main Interactive Digits Card with Scroll */}
      <div className="flex items-center justify-center gap-2.5 py-1">
        <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 p-2 border border-border/50 shadow-sm">
          {/* Hour Unit Column */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => stepHour(1)}
              className="h-5 w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="ঘণ্টা বাড়ান"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <div
              ref={hourRef}
              onClick={() => setActiveUnit('hour')}
              onTouchStart={handleTouchStart}
              onTouchMove={(e) => handleTouchMove(e, 'hour')}
              onTouchEnd={handleTouchEnd}
              role="listbox"
              aria-label="ঘণ্টা"
              tabIndex={0}
              className={cn(
                "h-14 w-14 rounded-xl text-2xl font-bold tabular-nums transition-all flex items-center justify-center cursor-ns-resize select-none",
                "overscroll-contain overflow-y-auto id-preview-scroll",
                activeUnit === 'hour'
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-background/80 text-foreground hover:bg-muted border border-border/40"
              )}
            >
              {is24 ? String(h24).padStart(2, '0') : hour12}
            </div>
            <button
              type="button"
              onClick={() => stepHour(-1)}
              className="h-5 w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="ঘণ্টা কমান"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Colon Separator */}
          <span className="text-2xl font-bold text-muted-foreground/60 pb-1">:</span>

          {/* Minute Unit Column */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => stepMinute(1)}
              className="h-5 w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="মিনিট বাড়ান"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <div
              ref={minuteRef}
              onClick={() => setActiveUnit('minute')}
              onTouchStart={handleTouchStart}
              onTouchMove={(e) => handleTouchMove(e, 'minute')}
              onTouchEnd={handleTouchEnd}
              role="listbox"
              aria-label="মিনিট"
              tabIndex={0}
              className={cn(
                "h-14 w-14 rounded-xl text-2xl font-bold tabular-nums transition-all flex items-center justify-center cursor-ns-resize select-none",
                "overscroll-contain overflow-y-auto id-preview-scroll",
                activeUnit === 'minute'
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-background/80 text-foreground hover:bg-muted border border-border/40"
              )}
            >
              {String(minute).padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={() => stepMinute(-1)}
              className="h-5 w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="মিনিট কমান"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* AM / PM Segmented Control */}
        {!is24 && (
          <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-1.5 border border-border/50 shadow-sm" role="group" aria-label="AM বা PM নির্বাচন">
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                aria-pressed={period === item}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold transition-all",
                  period === item
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helpful scroll hint */}
      <p className="text-[10px] text-center text-muted-foreground/70">
        মাউস স্ক্রল বা বোতাম চেপে সময় পরিবর্তন করুন
      </p>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
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
        <DialogContent className="w-[calc(100vw-24px)] max-w-[320px] gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden">
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
        className="w-auto overflow-hidden rounded-[28px] border-0 bg-popover p-0 shadow-2xl"
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
