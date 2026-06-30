import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { toBnDigits, toEnDigits, parseLocaleNumber } from '@/lib/digits';

type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  /** Numeric value. When 0/null the field shows blank (with a faint placeholder). */
  value: number | null | undefined;
  /** Receives the parsed English number (0 when the field is cleared). */
  onValueChange: (value: number) => void;
  /** Force a digit locale; defaults to the app language. */
  locale?: 'bn' | 'en';
  /** Allow decimal point input (default true). */
  allowDecimal?: boolean;
};

/**
 * Controlled numeric input.
 * - Never shows a stray "0" — empty stays empty with a faint "০"/"0" placeholder.
 * - Bengali UI types & shows Bengali digits; English UI uses English digits.
 * - Always reports an English `number` via onValueChange so DB logic is unchanged.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, className, locale, allowDecimal = true, placeholder, ...props }, ref) => {
    const { language } = useLanguage();
    const bn = (locale ?? (language === 'bn' ? 'bn' : 'en')) === 'bn';

    // Local English-digit buffer to preserve intermediate states like "12." / "".
    const [buffer, setBuffer] = React.useState<string>(
      value === 0 || value == null || Number.isNaN(value as number) ? '' : String(value),
    );

    // Keep buffer in sync when the external value changes (and differs from buffer).
    React.useEffect(() => {
      const fromValue =
        value === 0 || value == null || Number.isNaN(value as number) ? '' : String(value);
      const bufNum = parseLocaleNumber(buffer);
      const valNum = value == null || Number.isNaN(value as number) ? NaN : Number(value);
      const sameNumber =
        (Number.isNaN(bufNum) && (Number.isNaN(valNum) || valNum === 0) && buffer === '') ||
        bufNum === valNum;
      if (!sameNumber) setBuffer(fromValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const display = bn ? toBnDigits(buffer) : buffer;

    const phRaw = placeholder != null ? String(placeholder) : '0';
    const ph = bn ? toBnDigits(phRaw) : phRaw;

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        className={cn('placeholder:text-muted-foreground/40', className)}
        placeholder={ph}
        value={display}
        onChange={(e) => {
          // Normalize to English digits, then strip invalid chars.
          let en = toEnDigits(e.target.value);
          const allowed = allowDecimal ? /[^0-9.\-]/g : /[^0-9\-]/g;
          en = en.replace(allowed, '');
          // keep a single leading minus
          en = en.replace(/(?!^)-/g, '');
          if (allowDecimal) {
            // keep only the first decimal point
            const firstDot = en.indexOf('.');
            if (firstDot !== -1) {
              en = en.slice(0, firstDot + 1) + en.slice(firstDot + 1).replace(/\./g, '');
            }
          }
          setBuffer(en);
          const parsed = parseLocaleNumber(en);
          onValueChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
      />
    );
  },
);
NumberInput.displayName = 'NumberInput';

export { NumberInput };
