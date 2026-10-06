import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface MonthYearPickerProps {
  /** Value in "YYYY-MM" format e.g. "2026-10" */
  value?: string;
  onChange?: (value: string) => void;
  /** Direct year string or number e.g. "2026" */
  year?: string | number;
  /** Direct month string or number (1-12 or "01"-"12") */
  month?: string | number;
  onYearChange?: (year: string) => void;
  onMonthChange?: (month: string) => void;
  bengali?: boolean;
  className?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const toBengaliDigit = (n: number | string) =>
  String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);

export const MonthYearPicker = ({
  value,
  onChange,
  year: propYear,
  month: propMonth,
  onYearChange,
  onMonthChange,
  bengali = true,
  className,
  disabled = false,
  fromYear = 2020,
  toYear = 2035,
}: MonthYearPickerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  // Normalize month (0-11) and year
  const currentDate = new Date();
  let currentY = currentDate.getFullYear();
  let currentM = currentDate.getMonth(); // 0-11

  if (value && value.includes('-')) {
    const parts = value.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (!isNaN(y)) currentY = y;
    if (!isNaN(m) && m >= 0 && m <= 11) currentM = m;
  } else {
    if (propYear !== undefined) {
      const y = typeof propYear === 'string' ? parseInt(propYear, 10) : propYear;
      if (!isNaN(y)) currentY = y;
    }
    if (propMonth !== undefined) {
      const m = typeof propMonth === 'string' ? parseInt(propMonth, 10) - 1 : Number(propMonth) - 1;
      if (!isNaN(m) && m >= 0 && m <= 11) currentM = m;
    }
  }

  const [selYear, setSelYear] = React.useState<number>(currentY);
  const [selMonth, setSelMonth] = React.useState<number>(currentM);

  React.useEffect(() => {
    setSelYear(currentY);
    setSelMonth(currentM);
  }, [currentY, currentM]);

  const emitChange = (y: number, m: number) => {
    setSelYear(y);
    setSelMonth(m);
    const mStr = String(m + 1).padStart(2, '0');
    const yStr = String(y);
    if (onChange) onChange(`${yStr}-${mStr}`);
    if (onYearChange) onYearChange(yStr);
    if (onMonthChange) onMonthChange(mStr);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (selMonth === 0) {
      emitChange(selYear - 1, 11);
    } else {
      emitChange(selYear, selMonth - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (selMonth === 11) {
      emitChange(selYear + 1, 0);
    } else {
      emitChange(selYear, selMonth + 1);
    }
  };

  const monthNames = bengali ? BENGALI_MONTHS : ENGLISH_MONTHS;
  const displayLabel = bengali
    ? `${monthNames[selMonth]} ${toBengaliDigit(selYear)}`
    : `${monthNames[selMonth]} ${selYear}`;

  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = toYear; y >= fromYear; y--) arr.push(y);
    return arr;
  }, [fromYear, toYear]);

  const centerButton = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 h-10 min-w-[150px] px-3.5 rounded-2xl border border-input bg-background text-sm font-medium shadow-xs transition-all duration-300",
        "hover:border-primary/40 hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <CalendarIcon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-left truncate font-semibold">
        {displayLabel}
      </span>
    </button>
  );

  const prevButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={handlePrev}
      className="h-10 w-10 shrink-0 rounded-2xl border-input hover:border-primary/40 shadow-xs"
      title={bengali ? "পূর্ববর্তী মাস" : "Previous Month"}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
  );

  const nextButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={handleNext}
      className="h-10 w-10 shrink-0 rounded-2xl border-input hover:border-primary/40 shadow-xs"
      title={bengali ? "পরবর্তী মাস" : "Next Month"}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  );

  const panel = (
    <div className="w-[280px] p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {bengali ? "মাস ও বছর নির্বাচন" : "Select Month & Year"}
          </p>
          <p className="text-base font-bold text-foreground">{displayLabel}</p>
        </div>
        <Select value={String(selYear)} onValueChange={(val) => emitChange(parseInt(val, 10), selMonth)}>
          <SelectTrigger className="h-8 w-24 rounded-xl text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] rounded-xl">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {bengali ? toBengaliDigit(y) : y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 12-month Grid */}
      <div className="grid grid-cols-3 gap-2">
        {monthNames.map((name, idx) => {
          const isSelected = idx === selMonth;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                emitChange(selYear, idx);
                setOpen(false);
              }}
              className={cn(
                "h-9 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted/40 hover:bg-primary/10 text-foreground"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="pt-1 flex items-center justify-between border-t border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-xs"
          onClick={() => {
            const now = new Date();
            emitChange(now.getFullYear(), now.getMonth());
            setOpen(false);
          }}
        >
          {bengali ? "চলতি মাস" : "Current Month"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-lg text-xs"
          onClick={() => setOpen(false)}
        >
          {bengali ? "সম্পন্ন" : "Done"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {prevButton}
      {isMobile ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{centerButton}</DialogTrigger>
          <DialogContent className="w-[92vw] max-w-[320px] rounded-3xl border-0 p-0 shadow-2xl [&>button]:hidden">
            <DialogTitle className="sr-only">
              {bengali ? "মাস ও বছর নির্বাচন" : "Select Month & Year"}
            </DialogTitle>
            {panel}
          </DialogContent>
        </Dialog>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{centerButton}</PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden rounded-3xl border-0 bg-background/95 p-0 shadow-2xl backdrop-blur-xl"
            align="start"
            sideOffset={6}
          >
            {panel}
          </PopoverContent>
        </Popover>
      )}
      {nextButton}
    </div>
  );
};
