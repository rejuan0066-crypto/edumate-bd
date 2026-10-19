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
      <AlertDialogContent className="rounded-2xl bg-card border border-border text-card-foreground shadow-2xl max-w-md p-6">
        <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
          <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mb-1`}>
            <Icon className={`w-8 h-8 ${accent}`} />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            {title || (bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-foreground/85 font-medium text-sm">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:justify-center pt-3 border-t border-border">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-xl px-6 font-semibold ${btn}`}
          >
            {confirmLabel || (bn ? 'হ্যাঁ, নিশ্চিত' : 'Yes, Confirm')}
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-xl px-6 mt-0 font-semibold border-border">
            {cancelLabel || (bn ? 'না, থাক' : 'Cancel')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
