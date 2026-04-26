import { AlertTriangle } from 'lucide-react';
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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
}

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  isPending,
}: DeleteConfirmDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[28px] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border border-white/30 dark:border-white/10 shadow-2xl max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-1">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl font-bold">
            {title || (bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm">
            {description || (bn ? 'এই তথ্যটি ডিলিট করলে তা রিসাইকেল বিন-এ জমা থাকবে।' : 'This item will be moved to the recycle bin.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:justify-center pt-2">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_hsl(var(--destructive)/0.3)]"
          >
            {confirmLabel || (bn ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete')}
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-full px-6 mt-0">
            {bn ? 'না, থাক' : 'Cancel'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
