import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import ReceiptDesignerMain from '@/components/admin/receipt-designer/ReceiptDesignerMain';
import DonationReceiptDesigner from '@/components/admin/receipt-designer/DonationReceiptDesigner';
import { Receipt } from 'lucide-react';
import { useState } from 'react';

type DesignerTab = 'fee' | 'donation';

const AdminReceiptDesigner = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [tab, setTab] = useState<DesignerTab>('fee');

  const tabs: { key: DesignerTab; bn: string; en: string }[] = [
    { key: 'fee', bn: 'ফি রশিদ', en: 'Fee Receipt' },
    { key: 'donation', bn: 'দানের রশিদ', en: 'Donation Receipt' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            {bn ? 'রিসিট ডিজাইনার' : 'Receipt Designer'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${tab === t.key ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              {bn ? t.bn : t.en}
            </button>
          ))}
        </div>
        {tab === 'fee' && <ReceiptDesignerMain />}
        {tab === 'donation' && <DonationReceiptDesigner />}
      </div>
    </AdminLayout>
  );
};

export default AdminReceiptDesigner;
