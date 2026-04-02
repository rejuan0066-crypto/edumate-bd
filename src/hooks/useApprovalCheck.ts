import { useApprovalWorkflow } from './useApprovalWorkflow';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export const useApprovalCheck = (menuPath: string, targetTable: string) => {
  const { needsApproval, submitForApproval } = useApprovalWorkflow();
  const { language } = useLanguage();
  const bn = language === 'bn';

  /**
   * Check if the current action requires approval.
   * Returns true if intercepted (submitted for approval), false if should proceed normally.
   */
  const checkApproval = async (
    actionType: 'add' | 'edit' | 'delete',
    payload: Record<string, unknown>,
    targetId?: string,
    description?: string
  ): Promise<boolean> => {
    if (!needsApproval(menuPath, actionType)) return false;

    const success = await submitForApproval({
      actionType,
      targetTable,
      targetId,
      menuPath,
      payload,
      description,
    });

    if (success) {
      toast.info(
        bn
          ? '⏳ অনুমোদনের জন্য জমা দেওয়া হয়েছে। এডমিনের অনুমোদনের পর কার্যকর হবে।'
          : '⏳ Submitted for approval. Will take effect after admin approval.',
        { duration: 5000 }
      );
    } else {
      toast.error(bn ? 'অনুমোদনের জন্য জমা দিতে ব্যর্থ' : 'Failed to submit for approval');
    }
    return true;
  };

  return { checkApproval, needsApproval: (action?: 'view' | 'add' | 'edit' | 'delete') => needsApproval(menuPath, action) };
};
