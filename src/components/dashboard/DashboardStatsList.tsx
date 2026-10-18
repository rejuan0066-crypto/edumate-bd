import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from "@/contexts/ConfirmContext";

type TableType = 'students' | 'staff' | 'donors' | 'divisions' | 'subjects' | 'exam_sessions' | 'results';

interface StatsListProps {
  open: boolean;
  onClose: () => void;
  title: string;
  table: TableType;
  filters?: Record<string, any>;
}

const TABLE_CONFIG: Record<TableType, { selectQuery: string; editPath: string; nameField: string; statusField?: string; softDeleteField?: string }> = {
  students: { selectQuery: '*, classes(name_bn, name)', editPath: '/admin/students', nameField: 'name_bn', statusField: 'status', softDeleteField: 'status' },
  staff: { selectQuery: '*', editPath: '/admin/staff', nameField: 'name_bn', statusField: 'status', softDeleteField: 'status' },
  donors: { selectQuery: '*', editPath: '/admin/donors', nameField: 'name_bn', statusField: 'status', softDeleteField: 'status' },
  divisions: { selectQuery: '*, classes(id, name_bn, name)', editPath: '/admin/divisions', nameField: 'name_bn', statusField: 'is_active', softDeleteField: 'is_active' },
  subjects: { selectQuery: '*', editPath: '/admin/subjects', nameField: 'name_bn', statusField: 'is_active', softDeleteField: 'is_active' },
  exam_sessions: { selectQuery: '*, academic_sessions(name, name_bn)', editPath: '/admin/exam-sessions', nameField: 'name_bn', statusField: 'is_active' },
  results: { selectQuery: '*, students(name_bn, student_id), subjects(name_bn), exam_sessions(name_bn)', editPath: '/admin/results', nameField: 'id' },
};

const DashboardStatsList = ({ open, onClose, title, table, filters = {} }: StatsListProps) => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const config = TABLE_CONFIG[table];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['stats-list', table, filters],
    queryFn: async () => {
      let q: any = supabase.from(table).select(config.selectQuery) as any;
      if (table === 'students') {
        q = q.is('deleted_at', null);
      }
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const deleteMut = useMutation({
    mutationFn: async ({ id, field }: { id: string; field: string }) => {
      if (table === 'students') {
        const { error } = await supabase.from('students').update({ status: 'inactive', deleted_at: new Date().toISOString() } as any).eq('id', id);
        if (error) throw error;
        return;
      }
      const value = field === 'is_active' ? false : 'inactive';
      const { error } = await supabase.from(table).update({ [field]: value } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats-list', table] });
      qc.invalidateQueries({ queryKey: ['dashboard-students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-staff'] });
      qc.invalidateQueries({ queryKey: ['dashboard-donors'] });
      qc.invalidateQueries({ queryKey: ['dashboard-divisions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-subjects'] });
      qc.invalidateQueries({ queryKey: ['dashboard-exams'] });
      qc.invalidateQueries({ queryKey: ['dashboard-exam-sessions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-results'] });
      toast.success(bn ? 'সফলভাবে মুছে ফেলা হয়েছে' : 'Deleted successfully');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const handleEdit = (item: any) => {
    onClose();
    navigate(config.editPath);
  };

  const handleDelete = async (item: any) => {
    if (!config.softDeleteField) return;
    if (!(await confirm({ description: bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?', variant: 'destructive' }))) return;
    deleteMut.mutate({ id: item.id, field: config.softDeleteField });
  };

  const getStatusBadge = (item: any) => {
    if (!config.statusField) return null;
    const val = item[config.statusField];
    if (val === 'active' || val === true) {
      return <Badge className="bg-success/10 text-success hover:bg-success/20 text-[10px]">{bn ? 'সক্রিয়' : 'Active'}</Badge>;
    }
    if (val === 'inactive' || val === false) {
      return <Badge variant="destructive" className="text-[10px]">{bn ? 'নিষ্ক্রিয়' : 'Inactive'}</Badge>;
    }
    if (val === 'paid') return <Badge className="bg-success/10 text-success hover:bg-success/20 text-[10px]">{bn ? 'পরিশোধিত' : 'Paid'}</Badge>;
    return <Badge variant="outline" className="text-[10px]">{String(val)}</Badge>;
  };

  const renderColumns = (item: any, i: number) => {
    switch (table) {
      case 'students':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn || item.name_en}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.student_id || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.roll_number || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.classes?.name_bn || item.classes?.name || '-'}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'staff':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn || item.name_en}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.designation || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.phone || '-'}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'donors':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn || item.name_en}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.phone || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">৳{Number(item.donation_amount || 0).toLocaleString()}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'divisions':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.name}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.classes?.length || 0} {bn ? 'টি শ্রেণী' : 'classes'}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'subjects':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.name}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'exam_sessions':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.name_bn}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.exam_type || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.academic_sessions?.name || '-'}</td>
            <td className="px-3 py-2">{getStatusBadge(item)}</td>
          </>
        );
      case 'results':
        return (
          <>
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-foreground">{item.students?.name_bn || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.subjects?.name_bn || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.exam_sessions?.name_bn || '-'}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.marks ?? item.grade ?? '-'}</td>
          </>
        );
      default:
        return <td className="px-3 py-2">{i + 1}</td>;
    }
  };

  const renderHeaders = () => {
    const h = (t: string) => <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t}</th>;
    switch (table) {
      case 'students':
        return <>{h('#')}{h(bn ? 'নাম' : 'Name')}{h(bn ? 'আইডি' : 'ID')}{h(bn ? 'রোল' : 'Roll')}{h(bn ? 'শ্রেণী' : 'Class')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'staff':
        return <>{h('#')}{h(bn ? 'নাম' : 'Name')}{h(bn ? 'পদবী' : 'Designation')}{h(bn ? 'ফোন' : 'Phone')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'donors':
        return <>{h('#')}{h(bn ? 'নাম' : 'Name')}{h(bn ? 'ফোন' : 'Phone')}{h(bn ? 'অনুদান' : 'Amount')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'divisions':
        return <>{h('#')}{h(bn ? 'নাম (বাংলা)' : 'Name (BN)')}{h(bn ? 'নাম (ইংরেজি)' : 'Name (EN)')}{h(bn ? 'শ্রেণী' : 'Classes')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'subjects':
        return <>{h('#')}{h(bn ? 'নাম (বাংলা)' : 'Name (BN)')}{h(bn ? 'নাম (ইংরেজি)' : 'Name (EN)')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'exam_sessions':
        return <>{h('#')}{h(bn ? 'নাম' : 'Name')}{h(bn ? 'ধরন' : 'Type')}{h(bn ? 'সাল' : 'Year')}{h(bn ? 'স্ট্যাটাস' : 'Status')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      case 'results':
        return <>{h('#')}{h(bn ? 'ছাত্র' : 'Student')}{h(bn ? 'বিষয়' : 'Subject')}{h(bn ? 'পরীক্ষা' : 'Exam')}{h(bn ? 'নম্বর' : 'Marks')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
      default:
        return <>{h('#')}{h(bn ? 'অ্যাকশন' : 'Actions')}</>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title} ({items.length})</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>{renderHeaders()}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any, i: number) => (
                  <tr key={item.id} className="hover:bg-secondary/30">
                    {renderColumns(item, i)}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)} title={bn ? 'সম্পাদনা' : 'Edit'}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {config.softDeleteField && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item)} title={bn ? 'মুছুন' : 'Delete'} disabled={deleteMut.isPending}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DashboardStatsList;
