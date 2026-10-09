import AdminLayout from '@/components/AdminLayout';
import AccountsAuditView from '@/components/admin/AccountsAuditView';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';

export default function AdminAccountsAudit() {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {bn ? 'হিসাব ও আর্থিক অডিট লগ' : 'Accounts & Financial Audit Log'}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'কে কোন খরচ বা জমা তৈরি করেছে, কখন এডিট করেছে, কত টাকা পরিবর্তন করেছে এবং কে ডিলিট করেছে তার সম্পূর্ণ হিস্ট্রি।'
                : 'Full activity log showing who created, edited, deleted or disbursed expenses and deposits.'}
            </p>
          </div>
        </div>

        <AccountsAuditView />
      </div>
    </AdminLayout>
  );
}
