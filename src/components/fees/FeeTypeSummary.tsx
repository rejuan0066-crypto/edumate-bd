import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const FeeTypeSummary = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Fetch all active fee types
  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee_types_summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_types')
        .select('*, divisions(name_bn), classes(name_bn), academic_sessions:session_id(name, name_bn)')
        .eq('is_active', true)
        .order('fee_category')
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch all active students with their division/class/session info
  const { data: students = [] } = useQuery({
    queryKey: ['students_for_fee_summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, division_id, class_id, session_id, admission_session, is_free, status')
        .eq('status', 'active')
        .is('deleted_at', null);
      return data || [];
    },
  });

  // Fetch all fee waivers
  const { data: waivers = [] } = useQuery({
    queryKey: ['fee_waivers_summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_waivers')
        .select('student_id, fee_type_id, waiver_percent')
        .eq('is_active', true);
      return data || [];
    },
  });

  // Fetch all fee payments
  const { data: feePayments = [], isLoading } = useQuery({
    queryKey: ['fee_payments_summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_payments')
        .select('fee_type_id, student_id, amount, paid_amount, status');
      return data || [];
    },
  });

  // Fetch academic sessions for display
  const { data: sessions = [] } = useQuery({
    queryKey: ['academic_sessions_summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn')
        .order('name', { ascending: false });
      return data || [];
    },
  });

  // Build waiver map: { `${studentId}_${feeTypeId}`: waiver_percent }
  const waiverMap = useMemo(() => {
    const map: Record<string, number> = {};
    waivers.forEach((w: any) => {
      map[`${w.student_id}_${w.fee_type_id}`] = w.waiver_percent || 0;
    });
    return map;
  }, [waivers]);

  // Build payment map: { feeTypeId: { paid, pending, unpaid } }
  const paymentsByFeeType = useMemo(() => {
    const map: Record<string, { paid: number; pending: number; unpaid: number; paidCount: number; pendingCount: number; unpaidCount: number }> = {};
    feePayments.forEach((fp: any) => {
      const key = fp.fee_type_id;
      if (!map[key]) map[key] = { paid: 0, pending: 0, unpaid: 0, paidCount: 0, pendingCount: 0, unpaidCount: 0 };
      if (fp.status === 'paid') {
        map[key].paid += Number(fp.paid_amount || fp.amount || 0);
        map[key].paidCount++;
      } else if (fp.status === 'pending') {
        map[key].pending += Number(fp.paid_amount || fp.amount || 0);
        map[key].pendingCount++;
      } else {
        map[key].unpaid += Number(fp.amount || 0);
        map[key].unpaidCount++;
      }
    });
    return map;
  }, [feePayments]);

  // Calculate summary for each fee type
  const summaryData = useMemo(() => {
    return feeTypes.map((ft: any) => {
      // Find applicable students (match division/class, exclude is_free)
      const applicableStudents = students.filter((s: any) => {
        if (s.is_free) return false;
        if (ft.division_id && ft.division_id !== s.division_id) return false;
        if (ft.class_id && ft.class_id !== s.class_id) return false;
        if (ft.session_id && ft.session_id !== s.session_id) return false;
        return true;
      });

      const studentCount = applicableStudents.length;
      const feeAmount = Number(ft.amount || 0);

      // Calculate total expected (minus waivers) — running monthly basis
      let totalExpected = 0;
      let totalWaiverAmount = 0;
      const currentMonthIndex = new Date().getMonth(); // 0-based
      const MONTHS_EN_LIST = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      applicableStudents.forEach((s: any) => {
        const waiverKey = `${s.id}_${ft.id}`;
        const waiverPercent = waiverMap[waiverKey] || 0;
        const discount = (feeAmount * waiverPercent) / 100;
        totalWaiverAmount += discount;

        // For monthly fees, only count months up to and including current month
        if (ft.payment_frequency === 'monthly') {
          const applicableMonths: string[] | null = ft.applicable_months && Array.isArray(ft.applicable_months) ? (ft.applicable_months as any[]).map(String) : null;
          let runningMonthsCount = 0;
          for (let i = 0; i <= currentMonthIndex; i++) {
            if (!applicableMonths || applicableMonths.includes(MONTHS_EN_LIST[i])) {
              runningMonthsCount++;
            }
          }
          totalExpected += (feeAmount - discount) * runningMonthsCount;
        } else {
          totalExpected += feeAmount - discount;
        }
      });

      const payments = paymentsByFeeType[ft.id] || { paid: 0, pending: 0, unpaid: 0, paidCount: 0, pendingCount: 0, unpaidCount: 0 };
      const due = Math.max(0, totalExpected - payments.paid - payments.pending);

      // Session name
      const sessionName = ft.academic_sessions
        ? (bn ? ft.academic_sessions.name_bn || ft.academic_sessions.name : ft.academic_sessions.name)
        : '';

      // Category label
      const categoryLabels: Record<string, { bn: string; en: string }> = {
        admission: { bn: 'ভর্তি', en: 'Admission' },
        monthly: { bn: 'মাসিক', en: 'Monthly' },
        exam: { bn: 'পরীক্ষা', en: 'Exam' },
        other: { bn: 'অন্যান্য', en: 'Other' },
      };
      const catLabel = categoryLabels[ft.fee_category] || { bn: ft.fee_category, en: ft.fee_category };

      return {
        id: ft.id,
        name: bn ? ft.name_bn : ft.name,
        category: bn ? catLabel.bn : catLabel.en,
        feeCategory: ft.fee_category,
        sessionName,
        divisionName: ft.divisions?.name_bn || (bn ? 'সব বিভাগ' : 'All Divisions'),
        className: ft.classes?.name_bn || (bn ? 'সব শ্রেণী' : 'All Classes'),
        feeAmount,
        studentCount,
        totalWaiverAmount,
        totalExpected,
        collected: payments.paid,
        pending: payments.pending,
        due,
        paidCount: payments.paidCount,
        pendingCount: payments.pendingCount,
      };
    });
  }, [feeTypes, students, waiverMap, paymentsByFeeType, bn]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof summaryData> = {};
    summaryData.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [summaryData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (summaryData.length === 0) {
    return (
      <div className="card-elevated p-4 text-center text-sm text-muted-foreground">
        {bn ? 'কোনো ফি ধরন নেই' : 'No fee types found'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {bn ? 'ফি ধরন অনুযায়ী সারাংশ' : 'Fee Type-wise Summary'}
      </h3>

      {Object.entries(groupedByCategory).map(([category, items]) => {
        const catTotal = items.reduce((s, i) => s + i.totalExpected, 0);
        const catCollected = items.reduce((s, i) => s + i.collected, 0);
        const catPending = items.reduce((s, i) => s + i.pending, 0);
        const catDue = items.reduce((s, i) => s + i.due, 0);

        return (
          <div key={category} className="card-elevated p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs font-semibold">
                {category}
              </Badge>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-foreground font-semibold">৳{catTotal.toLocaleString()}</span>
                <span className="text-success">৳{catCollected.toLocaleString()}</span>
                <span className="text-warning">৳{catPending.toLocaleString()}</span>
                <span className="text-destructive">৳{catDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">{bn ? 'ফি ধরন' : 'Fee Type'}</th>
                    <th className="text-left py-2 px-2">{bn ? 'সেশন' : 'Session'}</th>
                    <th className="text-left py-2 px-2">{bn ? 'বিভাগ/শ্রেণী' : 'Div/Class'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'ছাত্র' : 'Students'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'একক ফি' : 'Unit Fee'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'ডিসকাউন্ট' : 'Discount'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'মোট ধার্য' : 'Total'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'আদায়' : 'Collected'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'পেন্ডিং' : 'Pending'}</th>
                    <th className="text-right py-2 px-2">{bn ? 'বকেয়া' : 'Due'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/30">
                      <td className="py-2 px-2 font-medium text-foreground">{item.name}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">{item.sessionName || '-'}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {item.divisionName} / {item.className}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{item.studentCount}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">৳{item.feeAmount.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-warning">
                        {item.totalWaiverAmount > 0 ? `৳${item.totalWaiverAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-foreground">৳{item.totalExpected.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-semibold text-success">
                        ৳{item.collected.toLocaleString()}
                        {item.paidCount > 0 && <span className="text-[10px] text-muted-foreground ml-1">({item.paidCount})</span>}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-warning">
                        ৳{item.pending.toLocaleString()}
                        {item.pendingCount > 0 && <span className="text-[10px] text-muted-foreground ml-1">({item.pendingCount})</span>}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-destructive">৳{item.due.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FeeTypeSummary;
