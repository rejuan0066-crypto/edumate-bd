import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import ReceiptDesignerMain from '@/components/admin/receipt-designer/ReceiptDesignerMain';
import { Receipt } from 'lucide-react';

const AdminReceiptDesigner = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            {bn ? 'রিসিট ডিজাইনার' : 'Receipt Designer'}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {bn ? 'আপনার ফি রিসিটের লেআউট ড্র্যাগ-এন্ড-ড্রপ দিয়ে কাস্টমাইজ করুন। সেভ করলে সব জায়গায় এই ডিজাইন প্রয়োগ হবে।' : 'Customize your fee receipt layout with drag-and-drop. Once saved, this design will be applied everywhere.'}
        </p>
        <ReceiptDesignerMain />
      </div>
    </AdminLayout>
  );
};

export default AdminReceiptDesigner;
