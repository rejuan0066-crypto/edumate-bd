import { CheckCircle2, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  variant?: 'success' | 'neutral';
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isPending,
  variant = 'success',
}: ConfirmDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const isSuccess = variant === 'success';
  const Icon = isSuccess ? CheckCircle2 : HelpCircle;
  const accent = isSuccess ? 'text-emerald-600' : 'text-primary';
  const bg = isSuccess ? 'bg-emerald-500/10' : 'bg-primary/10';
  const btn = isSuccess
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_hsl(142_76%_36%/0.3)]'
    : 'bg-primary text-primary-foreground hover:bg-primary/90';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[28px] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border border-white/30 dark:border-white/10 shadow-2xl max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
          <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center mb-1`}>
            <Icon className={`w-8 h-8 ${accent}`} />
          </div>
          <AlertDialogTitle className="text-xl font-bold">
            {title || (bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-muted-foreground text-sm">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:justify-center pt-2">
          <AlertDialogCancel className="rounded-full px-6 mt-0">
            {cancelLabel || (bn ? 'না, থাক' : 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-full px-6 ${btn}`}
          >
            {confirmLabel || (bn ? 'হ্যাঁ, নিশ্চিত' : 'Yes, Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
