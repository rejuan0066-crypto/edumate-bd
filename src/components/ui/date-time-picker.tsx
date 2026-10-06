import * as React from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';

export interface DateTimePickerProps {
  /** Value in ISO format or YYYY-MM-DDTHH:mm */
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  bengali?: boolean;
  placeholder?: string;
}

export const DateTimePicker = ({
  value = '',
  onChange,
  className,
  disabled = false,
  bengali = true,
  placeholder,
}: DateTimePickerProps) => {
  // Split value into date and time
  const [datePart, timePart] = React.useMemo(() => {
    if (!value) return ['', '09:00'];
    const parts = value.split('T');
    if (parts.length === 2) {
      return [parts[0], parts[1].slice(0, 5)];
    }
    // Might be just date
    return [parts[0], '09:00'];
  }, [value]);

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    onChange(`${newDate}T${timePart || '09:00'}`);
  };

  const handleTimeChange = (newTime: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const date = datePart || today;
    onChange(`${date}T${newTime || '09:00'}`);
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      <DatePicker
        value={datePart}
        onChange={handleDateChange}
        bengali={bengali}
        disabled={disabled}
        placeholder={placeholder ? `${placeholder} (তারিখ)` : undefined}
      />
      <TimePicker
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled}
      />
    </div>
  );
};
