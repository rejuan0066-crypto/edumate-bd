import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSectionCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  columns?: 2 | 3;
}

const ProfileSectionCard = ({ title, icon: Icon, children, className, columns = 2 }: ProfileSectionCardProps) => (
  <div className={cn(
    'relative rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all duration-200 shadow-sm',
    className
  )}>
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 shadow-xs">
          <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
      )}
      <h4 className="text-sm font-bold text-foreground tracking-tight">{title}</h4>
    </div>
    <div className={cn(
      'grid gap-x-4 gap-y-1',
      columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
    )}>
      {children}
    </div>
  </div>
);

export default ProfileSectionCard;
