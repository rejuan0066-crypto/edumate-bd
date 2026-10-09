import { supabase } from '@/integrations/supabase/client';
import { parseUserAgent, getGeoAndIspDetails } from '@/lib/deviceDetector';

export type AccountsAuditAction =
  | 'expense_create'
  | 'expense_update'
  | 'expense_delete'
  | 'expense_pay_due'
  | 'deposit_create'
  | 'deposit_update'
  | 'deposit_delete'
  | 'institution_create'
  | 'institution_update'
  | 'institution_delete'
  | 'category_create'
  | 'category_update'
  | 'category_delete'
  | 'salary_sync'
  | 'salary_disburse';

export interface AccountsAuditPayload {
  action: AccountsAuditAction;
  entity_type: 'expense' | 'deposit' | 'institution' | 'category' | 'salary';
  entity_id?: string;
  title: string;
  amount?: number;
  month_year?: string;
  institution_name?: string;
  category_name?: string;
  expense_method?: string;
  quantity?: number;
  memo_no?: string;
  recipient_or_by?: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  note?: string;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
}

export type AccountsAuditEntry = {
  id: string;
  created_at: string;
  event_type: string;
  resource: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  user_email: string | null;
  reason: string | null;
  metadata: AccountsAuditPayload & {
    device_model?: string;
    brand?: string;
    os?: string;
    browser?: string;
    city?: string;
    country?: string;
    isp?: string;
    timestamp?: string;
  };
};

/**
 * Logs a financial action into security_logs for permanent accountability
 */
export async function logAccountsAudit(payload: AccountsAuditPayload): Promise<void> {
  try {
    const dev = parseUserAgent();
    const geo = await getGeoAndIspDetails();

    await supabase.rpc('log_security_event', {
      p_event_type: 'accounts_audit',
      p_resource: typeof window !== 'undefined' ? window.location.pathname : '/admin/expenses',
      p_ip: geo?.ip || '0.0.0.0',
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_status: 200,
      p_reason: payload.action,
      p_metadata: {
        ...payload,
        device_model: dev.device_model,
        brand: dev.brand,
        os: dev.os,
        browser: dev.browser,
        city: geo?.city,
        country: geo?.country,
        isp: geo?.isp,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('Failed to record accounts audit log:', err);
  }
}

export const ACTION_CONFIG: Record<
  AccountsAuditAction,
  { label_bn: string; label_en: string; badge_class: string; icon_name: string }
> = {
  expense_create: {
    label_bn: 'নতুন খরচ যুক্ত',
    label_en: 'Expense Added',
    badge_class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    icon_name: 'PlusCircle',
  },
  expense_update: {
    label_bn: 'খরচ এডিট / সংশোধন',
    label_en: 'Expense Edited',
    badge_class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon_name: 'Edit3',
  },
  expense_delete: {
    label_bn: 'খরচ মুছে ফেলা',
    label_en: 'Expense Deleted',
    badge_class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    icon_name: 'Trash2',
  },
  expense_pay_due: {
    label_bn: 'বকেয়া খরচ পরিশোধ',
    label_en: 'Due Paid',
    badge_class: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    icon_name: 'CheckCircle2',
  },
  deposit_create: {
    label_bn: 'নতুন জমা এন্ট্রি',
    label_en: 'Deposit Added',
    badge_class: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30',
    icon_name: 'ArrowDownLeft',
  },
  deposit_update: {
    label_bn: 'জমা সংশোধন / এডিট',
    label_en: 'Deposit Edited',
    badge_class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon_name: 'Edit3',
  },
  deposit_delete: {
    label_bn: 'জমা মুছে ফেলা',
    label_en: 'Deposit Deleted',
    badge_class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    icon_name: 'Trash2',
  },
  institution_create: {
    label_bn: 'নতুন প্রতিষ্ঠান যুক্ত',
    label_en: 'Institution Created',
    badge_class: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    icon_name: 'Building2',
  },
  institution_update: {
    label_bn: 'প্রতিষ্ঠান এডিট',
    label_en: 'Institution Edited',
    badge_class: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    icon_name: 'Building2',
  },
  institution_delete: {
    label_bn: 'প্রতিষ্ঠান মুছে ফেলা',
    label_en: 'Institution Deleted',
    badge_class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    icon_name: 'Building2',
  },
  category_create: {
    label_bn: 'নতুন খাত / ক্যাটাগরি যুক্ত',
    label_en: 'Category Created',
    badge_class: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    icon_name: 'Tag',
  },
  category_update: {
    label_bn: 'ক্যাটাগরি এডিট',
    label_en: 'Category Edited',
    badge_class: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    icon_name: 'Tag',
  },
  category_delete: {
    label_bn: 'ক্যাটাগরি মুছে ফেলা',
    label_en: 'Category Deleted',
    badge_class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    icon_name: 'Tag',
  },
  salary_sync: {
    label_bn: 'বেতন হিসাব সিঙ্ক',
    label_en: 'Salary Synced',
    badge_class: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    icon_name: 'Wallet',
  },
  salary_disburse: {
    label_bn: 'বেতন পরিশোধ',
    label_en: 'Salary Disbursed',
    badge_class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    icon_name: 'Wallet',
  },
};
