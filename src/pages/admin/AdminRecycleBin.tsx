import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, RotateCcw, Loader2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

type TableKey = 'students' | 'staff' | 'fee_types' | 'fee_payments' | 'expenses' | 'donors' | 'notices' | 'library_books';

interface TableConfig {
  key: TableKey;
  label: string;
  labelBn: string;
  nameField: string;
  nameFieldBn?: string;
  extraFields?: { key: string; label: string; labelBn: string }[];
}

const TABLES: TableConfig[] = [
  { key: 'students', label: 'Students', labelBn: 'ছাত্র', nameField: 'name_en', nameFieldBn: 'name_bn', extraFields: [{ key: 'student_id', label: 'ID', labelBn: 'আইডি' }, { key: 'roll_number', label: 'Roll', labelBn: 'রোল' }] },
  { key: 'staff', label: 'Staff', labelBn: 'স্টাফ', nameField: 'name_en', nameFieldBn: 'name_bn', extraFields: [{ key: 'staff_id', label: 'ID', labelBn: 'আইডি' }] },
  { key: 'fee_types', label: 'Fee Types', labelBn: 'ফি টাইপ', nameField: 'name', nameFieldBn: 'name_bn' },
  { key: 'fee_payments', label: 'Fee Payments', labelBn: 'ফি পেমেন্ট', nameField: 'receipt_number', extraFields: [{ key: 'amount', label: 'Amount', labelBn: 'পরিমাণ' }] },
  { key: 'expenses', label: 'Expenses', labelBn: 'হিসাব', nameField: 'description', extraFields: [{ key: 'amount', label: 'Amount', labelBn: 'পরিমাণ' }] },
  { key: 'donors', label: 'Donors', labelBn: 'দাতা', nameField: 'name_en', nameFieldBn: 'name_bn' },
  { key: 'notices', label: 'Notices', labelBn: 'নোটিশ', nameField: 'title', nameFieldBn: 'title_bn' },
  { key: 'library_books', label: 'Library Books', labelBn: 'লাইব্রেরি বই', nameField: 'title', nameFieldBn: 'title_bn' },
];

const AdminRecycleBin = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TableKey>('students');
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'permanent_delete'; table: TableKey; id: string; name: string } | null>(null);

  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ['recycle-bin', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ table, id }: { table: TableKey; id: string }) => {
      const { error } = await supabase.from(table).update({ deleted_at: null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin', activeTab] });
      toast.success(bn ? 'সফলভাবে রিস্টোর করা হয়েছে' : 'Restored successfully');
      setConfirmAction(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: TableKey; id: string }) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin', activeTab] });
      toast.success(bn ? 'স্থায়ীভাবে মুছে ফেলা হয়েছে' : 'Permanently deleted');
      setConfirmAction(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tableConfig = TABLES.find(t => t.key === activeTab)!;

  const getItemName = (item: any) => {
    if (bn && tableConfig.nameFieldBn) return item[tableConfig.nameFieldBn] || item[tableConfig.nameField] || '-';
    return item[tableConfig.nameField] || (tableConfig.nameFieldBn ? item[tableConfig.nameFieldBn] : '-') || '-';
  };

  const isPending = restoreMutation.isPending || permanentDeleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{bn ? 'রিসাইকেল বিন' : 'Recycle Bin'}</h1>
          <p className="text-sm text-muted-foreground">{bn ? 'ডিলিট করা তথ্য এখান থেকে রিস্টোর বা স্থায়ীভাবে মুছতে পারবেন' : 'Restore or permanently delete removed items'}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableKey)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1 rounded-2xl">
          {TABLES.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="rounded-xl text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {bn ? t.labelBn : t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABLES.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : deletedItems.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 bg-card/50 border-dashed">
                <Package className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">{bn ? 'রিসাইকেল বিন খালি' : 'Recycle bin is empty'}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{bn ? 'কোনো ডিলিট হওয়া তথ্য নেই' : 'No deleted items found'}</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম/বিবরণ' : 'Name/Description'}</th>
                      {tableConfig.extraFields?.map(ef => (
                        <th key={ef.key} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? ef.labelBn : ef.label}</th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ডিলিটের তারিখ' : 'Deleted At'}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deletedItems.map((item: any, i: number) => (
                      <tr key={item.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{getItemName(item)}</td>
                        {tableConfig.extraFields?.map(ef => (
                          <td key={ef.key} className="px-4 py-3 text-muted-foreground">{item[ef.key] ?? '-'}</td>
                        ))}
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.deleted_at ? format(new Date(item.deleted_at), 'dd/MM/yyyy hh:mm a') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 gap-1"
                              onClick={() => setConfirmAction({ type: 'restore', table: t.key, id: item.id, name: getItemName(item) })}
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> {bn ? 'রিস্টোর' : 'Restore'}
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 rounded-full text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => setConfirmAction({ type: 'permanent_delete', table: t.key, id: item.id, name: getItemName(item) })}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {bn ? 'মুছুন' : 'Delete'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o && !isPending) setConfirmAction(null); }}>
        <AlertDialogContent className="rounded-[28px] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border border-white/30 dark:border-white/10 shadow-2xl max-w-md">
          <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-1 ${confirmAction?.type === 'restore' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-destructive/10'}`}>
              {confirmAction?.type === 'restore'
                ? <RotateCcw className="w-8 h-8 text-emerald-600" />
                : <AlertTriangle className="w-8 h-8 text-destructive" />
              }
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              {confirmAction?.type === 'restore'
                ? (bn ? 'রিস্টোর করতে চান?' : 'Restore this item?')
                : (bn ? 'স্থায়ীভাবে মুছতে চান?' : 'Permanently delete?')
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">{confirmAction?.name}</span>
              <br />
              {confirmAction?.type === 'restore'
                ? (bn ? 'এটি মূল তালিকায় ফিরে যাবে।' : 'This item will be moved back to the main list.')
                : (bn ? 'এটি আর কখনো ফেরত আনা যাবে না!' : 'This action cannot be undone!')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:justify-center pt-2">
            <AlertDialogCancel className="rounded-full px-6 mt-0" disabled={isPending}>
              {bn ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'restore') {
                  restoreMutation.mutate({ table: confirmAction.table, id: confirmAction.id });
                } else {
                  permanentDeleteMutation.mutate({ table: confirmAction.table, id: confirmAction.id });
                }
              }}
              className={`rounded-full px-6 ${confirmAction?.type === 'restore'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_hsl(var(--destructive)/0.3)]'
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {confirmAction?.type === 'restore'
                ? (bn ? 'হ্যাঁ, রিস্টোর করুন' : 'Yes, Restore')
                : (bn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete Forever')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRecycleBin;
