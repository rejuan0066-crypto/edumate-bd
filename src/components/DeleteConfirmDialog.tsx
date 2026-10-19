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
      <AlertDialogContent className="rounded-2xl bg-card border border-border text-card-foreground shadow-2xl max-w-md p-6">
        <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-1">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            {title || (bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/85 font-medium text-sm">
            {description || (bn ? 'এই তথ্যটি ডিলিট করলে তা রিসাইকেল বিন-এ জমা থাকবে।' : 'This item will be moved to the recycle bin.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:justify-center pt-3 border-t border-border">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-xl px-6 font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
          >
            {confirmLabel || (bn ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete')}
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-xl px-6 mt-0 font-semibold border-border">
            {bn ? 'না, থাক' : 'Cancel'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
