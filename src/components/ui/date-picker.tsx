import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  bengali?: boolean;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
  /** Dates ("YYYY-MM-DD") to highlight as holidays in the calendar */
  holidayDates?: string[];
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

const DatePicker = ({
  value,
  onChange,
  placeholder,
  className,
  bengali = true,
  fromYear = 1950,
  toYear = 2060,
  disabled = false,
  holidayDates,
}: DatePickerProps) => {
  const holidayDayObjects = React.useMemo(
    () =>
      (holidayDates || [])
        .map((d) => parse(d, 'yyyy-MM-dd', new Date()))
        .filter((d) => isValid(d)),
    [holidayDates],
  );
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(new Date());

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  React.useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [selected]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  const displayValue = React.useMemo(() => {
    if (!selected) return '';
    if (bengali) {
      const d = selected.getDate();
      const m = BENGALI_MONTHS[selected.getMonth()];
      const y = selected.getFullYear();
      return `${toBengaliDigit(d)} ${m}, ${toBengaliDigit(y)}`;
    }
    return format(selected, 'dd MMMM, yyyy');
  }, [selected, bengali]);

  const years = React.useMemo(() => {
    const arr = [];
    for (let y = toYear; y >= fromYear; y--) arr.push(y);
    return arr;
  }, [fromYear, toYear]);

  const handleMonthChange = (monthStr: string) => {
    const m = parseInt(monthStr);
    const newDate = new Date(viewMonth);
    newDate.setMonth(m);
    setViewMonth(newDate);
  };

  const handleYearChange = (yearStr: string) => {
    const y = parseInt(yearStr);
    const newDate = new Date(viewMonth);
    newDate.setFullYear(y);
    setViewMonth(newDate);
  };

  const defaultPlaceholder = bengali ? 'তারিখ নির্বাচন করুন' : 'Pick a date';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-300",
            "hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex-1 text-left truncate">
            {displayValue || placeholder || defaultPlaceholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-primary/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[28px] backdrop-blur-xl bg-background/95 overflow-hidden"
        align="start"
        sideOffset={6}
      >
        {/* Month/Year Quick Selector */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Select value={String(viewMonth.getMonth())} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-8 flex-1 rounded-xl text-xs font-medium border-input/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[200px]">
              {(bengali ? BENGALI_MONTHS : ENGLISH_MONTHS).map((m, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(viewMonth.getFullYear())} onValueChange={handleYearChange}>
            <SelectTrigger className="h-8 w-24 rounded-xl text-xs font-medium border-input/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[200px]">
              {years.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {bengali ? toBengaliDigit(y) : y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={viewMonth}
          onMonthChange={setViewMonth}
          locale={bengali ? bnLocale : undefined}
          initialFocus
          className="p-3"
        />

        {/* Today button */}
        <div className="px-4 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-xl h-8 text-xs font-medium text-primary hover:bg-primary/10"
            onClick={() => {
              const today = new Date();
              onChange(format(today, 'yyyy-MM-dd'));
              setViewMonth(today);
              setOpen(false);
            }}
          >
            {bengali ? 'আজকে' : 'Today'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { DatePicker };
