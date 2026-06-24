import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  /** Numeric value. When 0 the field shows blank so users don't have to clear a leading 0. */
  value: number | null | undefined;
  /** Receives the parsed number (0 when the field is cleared). */
  onValueChange: (value: number) => void;
};

/**
 * Controlled numeric input that renders an empty string for 0 / null / undefined
 * instead of showing a stray "0". Fixes the site-wide "0 auto appears" issue.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        className={cn(className)}
        value={value === 0 || value == null || Number.isNaN(value) ? '' : value}
        onChange={(e) => {
          const raw = e.target.value;
          onValueChange(raw === '' ? 0 : Number(raw));
        }}
      />
    );
  }
);
NumberInput.displayName = 'NumberInput';

export { NumberInput };
