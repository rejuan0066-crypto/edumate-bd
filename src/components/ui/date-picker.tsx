import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerProps {
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

const toBengaliDigit = (n: number | string) =>
  String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);

const DatePicker = ({
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
}: DatePickerProps) => {
  const holidayDayObjects = React.useMemo(
    () =>
      (holidayDates || [])
        .map((d) => parse(d, 'yyyy-MM-dd', new Date()))
        .filter((d) => isValid(d)),
    [holidayDates],
  );
  const holidayMap = React.useMemo(() => {
    const m: Record<string, { label?: string; type?: string }> = {};
    (holidayInfo || []).forEach((h) => {
      m[h.date] = { label: h.label, type: h.type };
    });
    return m;
  }, [holidayInfo]);
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(new Date());
  const isMobile = useIsMobile();

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

  const today = new Date();
  const headerLabel = displayValue || (bengali ? 'কোনো তারিখ নির্বাচিত নয়' : 'No date selected');

  const trigger = (
    <button
      id={id}
      name={name}
      type="button"
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-300",
        "hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-muted-foreground",
        className,
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

  const panel = (
    <div className="w-full">
      {/* selected date header */}
      <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
          {bengali ? 'নির্বাচিত তারিখ' : 'Selected date'}
        </p>
        <p className={cn("text-xl font-bold leading-tight", !displayValue && "text-muted-foreground font-medium text-base")}>
          {headerLabel}
        </p>
      </div>

      {/* Month/Year Quick Selector */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Select value={String(viewMonth.getMonth())} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-9 flex-1 rounded-xl text-sm font-semibold border-input/60 bg-background/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-[220px]">
            {(bengali ? BENGALI_MONTHS : ENGLISH_MONTHS).map((m, i) => (
              <SelectItem key={i} value={String(i)} className="text-sm">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(viewMonth.getFullYear())} onValueChange={handleYearChange}>
          <SelectTrigger className="h-9 w-24 rounded-xl text-sm font-semibold border-input/60 bg-background/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-[220px]">
            {years.map(y => (
              <SelectItem key={y} value={String(y)} className="text-sm">
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
        modifiers={{ holiday: holidayDayObjects }}
        modifiersClassNames={{
          holiday: "text-destructive font-bold bg-destructive/10 rounded-xl",
        }}
        classNames={{
          caption: "hidden",
          nav: "hidden",
          table: "rdp-table w-full border-collapse",
          head_row: "rdp-head_row flex justify-between",
          head_cell: "rdp-head_cell text-primary/80 rounded-md w-9 font-bold text-[0.68rem] tracking-wider text-center",
          row: "rdp-row flex w-full justify-between mt-1",
          cell: "rdp-cell h-9 w-9 text-center text-sm p-0 relative",
          day: "rdp-day h-9 w-9 p-0 font-medium rounded-xl transition-all duration-150 hover:bg-primary/10 hover:text-primary aria-selected:opacity-100",
          day_selected: "rdp-day_selected bg-primary text-primary-foreground shadow-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary scale-110",
          day_today: "rdp-day_today ring-2 ring-primary/50 text-primary font-bold",
          day_outside: "rdp-day_outside text-muted-foreground/30",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          DayContent: ({ date }) => {
            const key = format(date, 'yyyy-MM-dd');
            const info = holidayMap[key];
            const label = bengali ? toBengaliDigit(date.getDate()) : date.getDate();
            if (!info) return <>{label}</>;
            const dateStr = bengali
              ? `${toBengaliDigit(date.getDate())} ${BENGALI_MONTHS[date.getMonth()]}, ${toBengaliDigit(date.getFullYear())}`
              : format(date, 'dd MMMM, yyyy');
            const title = [
              dateStr,
              info.label ? `${bengali ? 'কারণ' : 'Reason'}: ${info.label}` : '',
              info.type ? `${bengali ? 'ধরন' : 'Type'}: ${info.type}` : '',
            ].filter(Boolean).join('\n');
            return (
              <span title={title} className="flex h-full w-full items-center justify-center cursor-help">
                {label}
              </span>
            );
          },
        }}
        initialFocus
        className="px-3 pb-2 pt-1 pointer-events-auto"
      />

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-1 border-t border-border/50">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 flex-1 rounded-xl text-sm font-semibold"
          onClick={() => {
            const t = new Date();
            onChange(format(t, 'yyyy-MM-dd'));
            setViewMonth(t);
            setOpen(false);
          }}
        >
          {bengali ? 'আজকে' : 'Today'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-destructive"
            onClick={() => { onChange(''); setOpen(false); }}
          >
            {bengali ? 'মুছুন' : 'Clear'}
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-[92vw] max-w-[340px] max-h-[88vh] overflow-y-auto gap-0 rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">{bengali ? 'তারিখ নির্বাচন' : 'Select date'}</DialogTitle>
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

export { DatePicker };

