import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';

interface StatsListProps {
  open: boolean;
  onClose: () => void;
  title: string;
  table: 'students' | 'staff' | 'donors';
  filters?: Record<string, any>;
}

const DashboardStatsList = ({ open, onClose, title, table, filters = {} }: StatsListProps) => {
  const { language } = useLanguage();

  const { data: items = [] } = useQuery({
    queryKey: ['stats-list', table, filters],
    queryFn: async () => {
      let q: any = supabase.from(table).select(table === 'students' ? '*, divisions(name_bn)' : '*') as any;
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title} ({items.length})</DialogTitle></DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                {table === 'students' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>}
                {table === 'students' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'বিভাগ' : 'Division'}</th>}
                {table === 'staff' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'পদবী' : 'Designation'}</th>}
                {table === 'staff' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}</th>}
                {table === 'donors' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}</th>}
                {table === 'donors' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'অনুদান' : 'Amount'}</th>}
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item: any, i: number) => (
                <tr key={item.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{item.name_bn}</td>
                  {table === 'students' && <td className="px-3 py-2 text-muted-foreground">{item.roll_number || '-'}</td>}
                  {table === 'students' && <td className="px-3 py-2 text-muted-foreground">{(item as any).divisions?.name_bn || '-'}</td>}
                  {table === 'staff' && <td className="px-3 py-2 text-muted-foreground">{item.designation || '-'}</td>}
                  {table === 'staff' && <td className="px-3 py-2 text-muted-foreground">{item.phone || '-'}</td>}
                  {table === 'donors' && <td className="px-3 py-2 text-muted-foreground">{item.phone || '-'}</td>}
                  {table === 'donors' && <td className="px-3 py-2 text-muted-foreground">৳{Number(item.donation_amount || 0).toLocaleString()}</td>}
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {item.status === 'active' ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়/পদত্যাগী' : 'Inactive/Resigned')}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">{language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardStatsList;
