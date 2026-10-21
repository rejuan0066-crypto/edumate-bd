import * as React from "react";
import { format, parse, isValid } from "date-fns";
import {
  CalendarIcon,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  bengali?: boolean;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
  clearable?: boolean;
  /** Dates ("YYYY-MM-DD") to highlight as holidays in the calendar */
  holidayDates?: string[];
  /** Optional holiday details keyed for hover tooltip (date, reason, type) */
  holidayInfo?: { date: string; label?: string; type?: string }[];
}

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SHORT_MONTHS_BN = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

const WEEKDAYS_EN = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];
const WEEKDAYS_BN = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র'];

const toBengaliDigit = (n: number | string) =>
  String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  className,
  bengali = true,
  fromYear = 1950,
  toYear = 2060,
  disabled = false,
  clearable = false,
  holidayDates,
  holidayInfo,
}) => {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // Selected date parsed
  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : null;
  }, [value]);

  // Current view Year & Month
  const [viewYear, setViewYear] = React.useState<number>(() =>
    selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState<number>(() =>
    selectedDate ? selectedDate.getMonth() : new Date().getMonth()
  );

  // View mode: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = React.useState<'days' | 'months' | 'years'>('days');

  // Sync view when selectedDate changes or popover opens
  React.useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (open) {
      setViewMode('days');
      if (selectedDate) {
        setViewYear(selectedDate.getFullYear());
        setViewMonth(selectedDate.getMonth());
      }
    }
  }, [open, selectedDate]);

  // Holiday lookups
  const holidaySet = React.useMemo(() => new Set(holidayDates || []), [holidayDates]);
  const holidayMap = React.useMemo(() => {
    const map: Record<string, { label?: string; type?: string }> = {};
    (holidayInfo || []).forEach(h => {
      map[h.date] = { label: h.label, type: h.type };
    });
    return map;
  }, [holidayInfo]);

  // Today string YYYY-MM-DD
  const todayDate = new Date();
  const todayString = format(todayDate, 'yyyy-MM-dd');

  // Month navigation: Chrome native picker uses Up for previous month, Down for next month
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Trigger display formatting
  const displayValue = React.useMemo(() => {
    if (!selectedDate) return '';
    if (bengali) {
      const d = selectedDate.getDate();
      const m = BENGALI_MONTHS[selectedDate.getMonth()];
      const y = selectedDate.getFullYear();
      return `${toBengaliDigit(d)} ${m}, ${toBengaliDigit(y)}`;
    }
    return format(selectedDate, 'dd MMMM, yyyy');
  }, [selectedDate, bengali]);

  const defaultPlaceholder = bengali ? 'তারিখ নির্বাচন করুন' : 'Pick a date';

  // 42-cell Calendar Grid (6 rows x 7 cols) starting on Saturday
  const calendarCells = React.useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const jsDay = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // When week starts on Saturday: Saturday is 0, Sunday is 1, ..., Friday is 6
    const startCol = (jsDay + 1) % 7;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isHoliday: boolean;
      holidayTooltip?: string;
    }> = [];

    // Trailing days from previous month
    for (let i = startCol - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const ds = format(d, 'yyyy-MM-dd');
      cells.push({
        dateString: ds,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isSelected: ds === value,
        isHoliday: holidaySet.has(ds),
        holidayTooltip: holidayMap[ds]?.label,
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(viewYear, viewMonth, dayNum);
      const ds = format(d, 'yyyy-MM-dd');
      cells.push({
        dateString: ds,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: ds === todayString,
        isSelected: ds === value,
        isHoliday: holidaySet.has(ds),
        holidayTooltip: holidayMap[ds]?.label,
      });
    }

    // Leading days from next month to make exactly 42 cells (6 full weeks)
    const remaining = 42 - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(viewYear, viewMonth + 1, dayNum);
      const ds = format(d, 'yyyy-MM-dd');
      cells.push({
        dateString: ds,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isSelected: ds === value,
        isHoliday: holidaySet.has(ds),
        holidayTooltip: holidayMap[ds]?.label,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayString, value, holidaySet, holidayMap]);

  // Year range list for year selection
  const yearsList = React.useMemo(() => {
    const list: number[] = [];
    for (let y = toYear; y >= fromYear; y--) {
      list.push(y);
    }
    return list;
  }, [fromYear, toYear]);

  // Month label for the header (e.g. "October 2026")
  const currentMonthLabel = `${ENGLISH_MONTHS[viewMonth]} ${viewYear}`;

  const handleSelectDate = (dateString: string) => {
    onChange(dateString);
    setOpen(false);
  };

  const handleToday = () => {
    const t = new Date();
    const tStr = format(t, 'yyyy-MM-dd');
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    onChange(tStr);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  // Trigger input button
  const trigger = (
    <button
      id={id}
      name={name}
      type="button"
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-muted-foreground",
        className
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <CalendarIcon className="h-3.5 w-3.5" />
      </span>
      <span className={cn("flex-1 text-left truncate", value && "font-medium")}>
        {displayValue || placeholder || defaultPlaceholder}
      </span>
      {clearable && value && !disabled && (
        <span
          role="button"
          tabIndex={0}
          aria-label="তারিখ মুছুন"
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

  // Chrome Native-style Calendar Panel
  const panel = (
    <div className="w-[260px] p-3 bg-popover text-popover-foreground rounded-lg border border-border/80 shadow-2xl select-none font-sans">
      {/* Top Header: "October 2026 ▾" and Up / Down Arrows */}
      <div className="flex items-center justify-between mb-2 pb-1">
        <button
          type="button"
          onClick={() => setViewMode(prev => (prev === 'days' ? 'months' : 'days'))}
          className="flex items-center gap-1 font-bold text-[14px] text-foreground hover:text-primary transition-colors py-0.5 px-1 rounded hover:bg-muted/60"
        >
          <span>{currentMonthLabel}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              viewMode !== 'days' && "rotate-180"
            )}
          />
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={
              viewMode === 'days'
                ? handlePrevMonth
                : viewMode === 'months'
                ? () => setViewYear(y => y - 1)
                : () => setViewYear(y => y - 10)
            }
            title={bengali ? "পূর্ববর্তী" : "Previous"}
            className="h-7 w-7 flex items-center justify-center rounded text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={
              viewMode === 'days'
                ? handleNextMonth
                : viewMode === 'months'
                ? () => setViewYear(y => y + 1)
                : () => setViewYear(y => y + 10)
            }
            title={bengali ? "পরবর্তী" : "Next"}
            className="h-7 w-7 flex items-center justify-center rounded text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'days' && (
        <>
          {/* Weekday Row: Sa Su Mo Tu We Th Fr */}
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEKDAYS_EN.map((day, idx) => (
              <div
                key={day}
                title={WEEKDAYS_BN[idx]}
                className="text-[13px] font-medium text-foreground/80 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 42-Cell Dates Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
            {calendarCells.map((cell, idx) => {
              return (
                <button
                  key={`${cell.dateString}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDate(cell.dateString)}
                  title={cell.holidayTooltip ? `${cell.dateString} (${cell.holidayTooltip})` : cell.dateString}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center text-[13px] mx-auto transition-colors relative",
                    // Selected state: Solid Blue Box with white text
                    cell.isSelected
                      ? "bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-[3px] shadow-sm"
                      // Today's state (not selected): 1px border outline box
                      : cell.isToday
                      ? "border border-foreground/75 dark:border-foreground/80 text-foreground font-semibold rounded-[3px] hover:bg-muted/70"
                      // Outside Month: Muted gray text
                      : !cell.isCurrentMonth
                      ? "text-muted-foreground/45 font-normal hover:bg-muted/40 rounded-[3px]"
                      // Current Month: Standard text
                      : "text-foreground font-normal hover:bg-muted/70 rounded-[3px]",
                    // Holiday accent
                    cell.isHoliday && !cell.isSelected && "text-rose-600 font-semibold"
                  )}
                >
                  {cell.dayNumber}
                  {cell.isHoliday && !cell.isSelected && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-rose-500" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Month Selector View */}
      {viewMode === 'months' && (
        <div className="py-2">
          <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setViewMode('years')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>{bengali ? 'সাল পরিবর্তন করুন' : 'Change Year'}: {viewYear}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ENGLISH_MONTHS.map((m, idx) => {
              const isCurrent = idx === viewMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setViewMonth(idx);
                    setViewMode('days');
                  }}
                  className={cn(
                    "py-2 px-1 text-xs rounded-[4px] font-medium transition-colors text-center",
                    isCurrent
                      ? "bg-[#1a73e8] text-white font-bold shadow-sm"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {SHORT_MONTHS_EN[idx]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Year Selector View */}
      {viewMode === 'years' && (
        <div className="py-1">
          <div className="text-xs font-semibold text-muted-foreground px-1 pb-1 mb-1 border-b border-border/50">
            {bengali ? 'সাল নির্বাচন করুন' : 'Select Year'}
          </div>
          <div className="max-h-[190px] overflow-y-auto grid grid-cols-3 gap-1.5 p-1 pr-2">
            {yearsList.map((y) => {
              const isCurrent = y === viewYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setViewMode('months');
                  }}
                  className={cn(
                    "py-1.5 px-1 text-xs rounded-[4px] font-medium transition-colors text-center",
                    isCurrent
                      ? "bg-[#1a73e8] text-white font-bold shadow-sm"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Footer: "Clear" on left, "Today" on right */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/50 px-1">
        <button
          type="button"
          onClick={handleClear}
          className="text-[#1a73e8] dark:text-blue-400 font-medium text-[13px] hover:underline transition-all"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="text-[#1a73e8] dark:text-blue-400 font-medium text-[13px] hover:underline transition-all"
        >
          Today
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-auto max-w-[280px] p-0 rounded-xl border border-border/80 shadow-2xl [&>button]:hidden bg-transparent">
          <DialogTitle className="sr-only">
            {bengali ? 'তারিখ নির্বাচন' : 'Select date'}
          </DialogTitle>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-lg border-0 bg-transparent shadow-none"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
