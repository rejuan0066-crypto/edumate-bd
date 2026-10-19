import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileInfoItemProps {
  icon?: LucideIcon;
  label: string;
  value: string | number | null | undefined;
  className?: string;
  fullWidth?: boolean;
}

const ProfileInfoItem = ({ icon: Icon, label, value, className, fullWidth }: ProfileInfoItemProps) => {
  const displayValue = value == null || value === '' || value === '-' ? '-' : value;
  const isEmpty = displayValue === '-';

  return (
    <div className={cn(
      'group flex items-start gap-3 py-2.5 px-2 rounded-xl transition-colors duration-200 hover:bg-muted/30',
      fullWidth && 'col-span-full',
      className
    )}>
      {Icon && (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/10 shadow-sm shadow-emerald-500/5 transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className={cn(
          'text-sm font-semibold break-words leading-snug',
          isEmpty ? 'text-muted-foreground font-normal italic' : 'text-foreground'
        )}>
          {displayValue}
        </p>
      </div>
    </div>
  );
};

export default ProfileInfoItem;
