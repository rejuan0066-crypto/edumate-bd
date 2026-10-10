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

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
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
  const [h24, setH24] = React.useState<number>(11);
  const [minute, setMinute] = React.useState<number>(30);
  const [activeMode, setActiveMode] = React.useState<'hour' | 'minute'>('hour');
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

  // Clock Dial Geometry
  const DIAL_RADIUS = 110;
  const NUM_RADIUS = 82;

  const getPos = (index: number, total: number) => {
    const angleDeg = (index / total) * 360;
    const rad = (angleDeg * Math.PI) / 180;
    const x = DIAL_RADIUS + NUM_RADIUS * Math.sin(rad);
    const y = DIAL_RADIUS - NUM_RADIUS * Math.cos(rad);
    return { x, y, angleDeg };
  };

  const activeAngle = activeMode === 'hour'
    ? ((hour12 % 12) / 12) * 360
    : (minute / 60) * 360;

  const handRad = (activeAngle * Math.PI) / 180;
  const handTipX = DIAL_RADIUS + NUM_RADIUS * Math.sin(handRad);
  const handTipY = DIAL_RADIUS - NUM_RADIUS * Math.cos(handRad);

  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    let deg = Math.atan2(x, -y) * (180 / Math.PI);
    if (deg < 0) deg += 360;

    if (activeMode === 'hour') {
      const step = 360 / 12;
      const h = Math.round(deg / step) % 12 || 12;
      setHour(h);
      setActiveMode('minute');
    } else {
      const m = Math.round(deg / 6) % 60;
      setMinute(m);
    }
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
    <div className="w-[300px] select-none p-4 space-y-4">
      {/* Top Header & Digital Display Card */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
          {activeMode === 'hour' ? 'ঘণ্টা নির্ধারণ' : 'মিনিট নির্ধারণ'}
        </span>
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

      {/* Digital Digits + AM/PM Pill */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 p-1.5 border border-border/50">
          <button
            type="button"
            onClick={() => setActiveMode('hour')}
            className={cn(
              "h-12 w-14 rounded-xl text-2xl font-bold tabular-nums transition-all flex items-center justify-center",
              activeMode === 'hour'
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-foreground hover:bg-muted"
            )}
          >
            {is24 ? String(h24).padStart(2, '0') : hour12}
          </button>
          <span className="text-xl font-bold text-muted-foreground/60 animate-pulse">:</span>
          <button
            type="button"
            onClick={() => setActiveMode('minute')}
            className={cn(
              "h-12 w-14 rounded-xl text-2xl font-bold tabular-nums transition-all flex items-center justify-center",
              activeMode === 'minute'
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-foreground hover:bg-muted"
            )}
          >
            {String(minute).padStart(2, '0')}
          </button>
        </div>

        {/* AM / PM Segmented Control */}
        {!is24 && (
          <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-1 border border-border/50" role="group" aria-label="AM বা PM নির্বাচন">
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                aria-pressed={period === item}
                className={cn(
                  "h-6 px-2.5 rounded-lg text-xs font-bold transition-all",
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

      {/* Circular Clock Dial */}
      <div className="flex justify-center">
        <div
          onClick={handleDialClick}
          className="relative w-[220px] h-[220px] rounded-full bg-muted/25 border border-border/60 shadow-inner flex items-center justify-center cursor-pointer touch-none"
        >
          {/* SVG Clock Hand & Center */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Hand Line */}
            <line
              x1={DIAL_RADIUS}
              y1={DIAL_RADIUS}
              x2={handTipX}
              y2={handTipY}
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
            />
            {/* Center Pin */}
            <circle cx={DIAL_RADIUS} cy={DIAL_RADIUS} r="4" fill="hsl(var(--primary))" />
            {/* Active Tip Glow Circle */}
            <circle
              cx={handTipX}
              cy={handTipY}
              r="17"
              fill="hsl(var(--primary))"
              className="drop-shadow-sm"
            />
          </svg>

          {/* Numbers on Dial */}
          {activeMode === 'hour' ? (
            HOURS_12.map((h, i) => {
              const { x, y } = getPos(i, 12);
              const isSelected = hour12 === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHour(h);
                    setActiveMode('minute');
                  }}
                  style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                  className={cn(
                    "absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10",
                    isSelected
                      ? "text-primary-foreground font-black scale-110"
                      : "text-foreground/85 hover:text-primary"
                  )}
                >
                  {h}
                </button>
              );
            })
          ) : (
            MINUTE_STEPS.map((m, i) => {
              const { x, y } = getPos(i, 12);
              const isSelected = minute === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMinute(m);
                  }}
                  style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                  className={cn(
                    "absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10",
                    isSelected
                      ? "text-primary-foreground font-black scale-110"
                      : "text-foreground/85 hover:text-primary"
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Minutes Strip (Scrollable) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground/75 px-1">
          <span>দ্রুত মিনিট বাছাই</span>
          <span className="text-primary font-bold">{fmt(h24, minute)}</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto overflow-y-auto overscroll-contain id-preview-scroll p-1 rounded-xl bg-muted/20 border border-border/40">
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinute(m)}
              className={cn(
                "h-7 min-w-[34px] px-2 rounded-lg text-xs font-bold tabular-nums transition-all flex items-center justify-center shrink-0",
                minute === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {String(m).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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
