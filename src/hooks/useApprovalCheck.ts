import { useApprovalWorkflow } from './useApprovalWorkflow';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export const useApprovalCheck = (menuPath: string, targetTable: string) => {
  const { needsApproval, submitForApproval, isRecordPending } = useApprovalWorkflow();
  const { language } = useLanguage();
  const bn = language === 'bn';

  /**
   * Check if the current action requires approval.
   * Returns true if intercepted (submitted for approval), false if should proceed normally.
   */
  const checkApproval = async (
    actionType: 'add' | 'edit' | 'delete' | 'reject',
    payload: Record<string, unknown>,
    targetId?: string,
    description?: string
  ): Promise<boolean> => {
    if (!needsApproval(menuPath, actionType)) return false;

    // Check if the record is already locked for a pending action
    if (targetId && isRecordPending(targetTable, targetId)) {
      toast.warning(
        bn
          ? '⏳ এই রেকর্ডটি ইতিমধ্যে অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন করার পর কার্যকর হবে।'
          : '⏳ This record is already awaiting approval. It will take effect after approval.',
        { duration: 5000 }
      );
      return true;
    }

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
          ? '⏳ অনুমোদন প্রযোজ্য — রিকোয়েস্টটি জমা দেওয়া হয়েছে। অনুমোদন করার পর কার্যকর হবে।'
          : '⏳ Approval applicable — request submitted. Will take effect after approval.',
        { duration: 5000 }
      );
    } else {
      toast.error(bn ? 'অনুমোদনের জন্য জমা দিতে ব্যর্থ' : 'Failed to submit for approval');
    }
    return true;
  };

  return { 
    checkApproval, 
    needsApproval: (action?: 'view' | 'add' | 'edit' | 'delete' | 'reject') => needsApproval(menuPath, action),
    isRecordPending: (id: string) => isRecordPending(targetTable, id)
  };
};
