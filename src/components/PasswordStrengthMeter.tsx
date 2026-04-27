import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  bn?: boolean;
  className?: string;
}

interface Rule {
  key: string;
  label_bn: string;
  label_en: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { key: 'len', label_bn: 'কমপক্ষে ৮ অক্ষর', label_en: 'At least 8 characters', test: p => p.length >= 8 },
  { key: 'upper', label_bn: 'একটি বড় হাতের অক্ষর (A-Z)', label_en: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
  { key: 'lower', label_bn: 'একটি ছোট হাতের অক্ষর (a-z)', label_en: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
  { key: 'num', label_bn: 'একটি সংখ্যা (0-9)', label_en: 'One number (0-9)', test: p => /[0-9]/.test(p) },
  { key: 'sym', label_bn: 'একটি বিশেষ চিহ্ন (!@#$...)', label_en: 'One special character (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePasswordStrength(password: string): { score: number; passed: number; total: number } {
  const passed = RULES.filter(r => r.test(password)).length;
  return { score: password ? passed / RULES.length : 0, passed, total: RULES.length };
}

export function isPasswordStrong(password: string): boolean {
  return RULES.every(r => r.test(password));
}

const PasswordStrengthMeter = ({ password, bn = true, className }: PasswordStrengthMeterProps) => {
  const { passed, total } = evaluatePasswordStrength(password);
  const percent = (passed / total) * 100;

  const labelBn = passed === 0 ? '' : passed <= 2 ? 'দুর্বল' : passed <= 3 ? 'মাঝারি' : passed <= 4 ? 'ভালো' : 'শক্তিশালী';
  const labelEn = passed === 0 ? '' : passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed <= 4 ? 'Good' : 'Strong';
  const barColor = passed <= 2 ? 'bg-destructive' : passed <= 3 ? 'bg-amber-500' : passed <= 4 ? 'bg-blue-500' : 'bg-emerald-500';
  const textColor = passed <= 2 ? 'text-destructive' : passed <= 3 ? 'text-amber-600' : passed <= 4 ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={cn('mt-2 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-300', barColor)} style={{ width: `${percent}%` }} />
        </div>
        {password && (
          <span className={cn('text-xs font-medium', textColor)}>
            {bn ? labelBn : labelEn}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map(r => {
          const ok = r.test(password);
          return (
            <li key={r.key} className={cn('flex items-center gap-1.5 text-[11px]', ok ? 'text-emerald-600' : 'text-muted-foreground')}>
              {ok ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-50" />}
              <span>{bn ? r.label_bn : r.label_en}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
