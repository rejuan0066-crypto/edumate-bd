import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Printer, ArrowDownUp, ListFilter } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { toast } from 'sonner';

type Row = {
  id: string;
  date: string; // yyyy-mm-dd
  type: 'credit' | 'debit';
  source: string;    // hisab/joma/fee/salary/other
  sourceLabel: string;
  institution: string;
  category: string;
  description: string;
  amount: number;
  ref: string;
  paymentMode: string; // cash/bank/bkash/nagad/rocket/card/other
};

const PAYMENT_MODES = ['cash', 'bank', 'bkash', 'nagad', 'rocket', 'card', 'cheque', 'other'] as const;
const modeLabel = (m: string, bn: boolean) => {
  const map: Record<string, [string, string]> = {
    cash: ['নগদ', 'Cash'], bank: ['ব্যাংক', 'Bank'], bkash: ['বিকাশ', 'bKash'],
    nagad: ['নগদ (Nagad)', 'Nagad'], rocket: ['রকেট', 'Rocket'], card: ['কার্ড', 'Card'],
    cheque: ['চেক', 'Cheque'], other: ['অন্যান্য', 'Other'],
  };
  const key = (m || 'other').toLowerCase();
  return (map[key] || [m, m])[bn ? 0 : 1];
};
const normalizeMode = (raw: any): string => {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return 'other';
  if (s.includes('bkash') || s.includes('বিকাশ')) return 'bkash';
  if (s.includes('nagad') || s.includes('নগদ')) return s.includes('cash') ? 'cash' : 'nagad';
  if (s.includes('rocket') || s.includes('রকেট')) return 'rocket';
  if (s.includes('cash') || s === 'নগদ') return 'cash';
  if (s.includes('bank') || s.includes('ব্যাংক')) return 'bank';
  if (s.includes('cheque') || s.includes('check') || s.includes('চেক')) return 'cheque';
  if (s.includes('card') || s.includes('কার্ড')) return 'card';
  return 'other';
};


const SOURCE_META: Record<string, { bn: string; en: string; color: string }> = {
  expense:  { bn: 'হিসাব',     en: 'Expense',  color: 'bg-rose-100 text-rose-700 border-rose-200' },
  deposit:  { bn: 'জমা/উত্তোলন', en: 'Deposit',  color: 'bg-sky-100 text-sky-700 border-sky-200' },
  fee:      { bn: 'ফি',        en: 'Fee',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  salary:   { bn: 'বেতন',      en: 'Salary',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  donation: { bn: 'অনুদান',    en: 'Donation', color: 'bg-violet-100 text-violet-700 border-violet-200' },
};

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
};
const today = () => new Date().toISOString().split('T')[0];

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const displayDate = (d: string) => {
  if (!d) return '-';
  const [y,m,day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

interface Props {
  bn: boolean;
  expenseInstitutions: any[];
  categories: any[];
  cleanDesc: (s: string) => string;
}

export default function LedgerReport({ bn, expenseInstitutions, categories, cleanDesc }: Props) {
  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [instFilter, setInstFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'simple' | 'classic'>('simple');
  const [sources, setSources] = useState<Record<string, boolean>>({
    expense: true, deposit: true, fee: true, salary: true, donation: true,
  });

  // Queries — date range based
  const { data: expenses = [], isLoading: l1 } = useQuery({
    queryKey: ['ledger_expenses', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses')
        .select('id, expense_date, description, amount, institution_id, category_id, expense_institutions(name, name_bn), expense_categories(name, name_bn)')
        .gte('expense_date', fromDate).lte('expense_date', toDate)
        .is('deleted_at', null);
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: deposits = [], isLoading: l2 } = useQuery({
    queryKey: ['ledger_deposits', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('deposits')
        .select('id, deposit_date, bank_details, other_details, amount, source')
        .gte('deposit_date', fromDate).lte('deposit_date', toDate);
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: feePayments = [], isLoading: l3 } = useQuery({
    queryKey: ['ledger_fees', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_payments')
        .select('id, paid_at, paid_amount, month, year, receipt_number, status, fee_types(name, name_bn), students(name, roll_number)')
        .eq('status', 'paid')
        .gte('paid_at', `${fromDate}T00:00:00`)
        .lte('paid_at', `${toDate}T23:59:59`)
        .is('deleted_at', null);
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: salary = [], isLoading: l4 } = useQuery({
    queryKey: ['ledger_salary', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_records')
        .select('id, paid_at, net_salary, month_year, status, staff(name, staff_id)')
        .in('status', ['paid', 'approved'])
        .gte('paid_at', `${fromDate}T00:00:00`)
        .lte('paid_at', `${toDate}T23:59:59`)
        .is('deleted_at', null);
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: donations = [], isLoading: l5 } = useQuery({
    queryKey: ['ledger_donations', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('verified_payments')
        .select('id, created_at, amount, trx_id, method, note')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);
      if (error) throw error;
      return data as any[];
    }
  });

  const loading = l1 || l2 || l3 || l4 || l5;

  // Build unified rows
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (sources.expense) {
      for (const e of expenses as any[]) {
        out.push({
          id: `exp-${e.id}`, date: e.expense_date, type: 'debit', source: 'expense',
          sourceLabel: bn ? SOURCE_META.expense.bn : SOURCE_META.expense.en,
          institution: bn ? (e.expense_institutions?.name_bn || '') : (e.expense_institutions?.name || ''),
          category: bn ? (e.expense_categories?.name_bn || '') : (e.expense_categories?.name || ''),
          description: cleanDesc(e.description || ''), amount: Number(e.amount || 0), ref: '',
          paymentMode: 'other',
        });
      }
    }
    if (sources.deposit) {
      for (const d of deposits as any[]) {
        const amt = Number(d.amount || 0);
        const mode = normalizeMode(d.source || (d.bank_details ? 'bank' : 'cash'));
        out.push({
          id: `dep-${d.id}`, date: d.deposit_date,
          type: amt >= 0 ? 'credit' : 'debit',
          source: 'deposit', sourceLabel: bn ? SOURCE_META.deposit.bn : SOURCE_META.deposit.en,
          institution: '-', category: d.source || '-',
          description: [d.bank_details, d.other_details].filter(Boolean).join(' — ') || '-',
          amount: Math.abs(amt), ref: '', paymentMode: mode,
        });
      }
    }
    if (sources.fee) {
      for (const f of feePayments as any[]) {
        const d = (f.paid_at || '').split('T')[0];
        out.push({
          id: `fee-${f.id}`, date: d, type: 'credit', source: 'fee',
          sourceLabel: bn ? SOURCE_META.fee.bn : SOURCE_META.fee.en,
          institution: '-',
          category: bn ? (f.fee_types?.name_bn || f.fee_types?.name || '-') : (f.fee_types?.name || '-'),
          description: `${f.students?.name || '-'}${f.students?.roll_number ? ` (${f.students.roll_number})` : ''} — ${f.month || ''}${f.year ? '/' + f.year : ''}`,
          amount: Number(f.paid_amount || 0),
          ref: f.receipt_number || '', paymentMode: 'cash',
        });
      }
    }
    if (sources.salary) {
      for (const s of salary as any[]) {
        const d = (s.paid_at || '').split('T')[0];
        out.push({
          id: `sal-${s.id}`, date: d, type: 'debit', source: 'salary',
          sourceLabel: bn ? SOURCE_META.salary.bn : SOURCE_META.salary.en,
          institution: '-', category: s.month_year || '-',
          description: `${s.staff?.name || '-'}${s.staff?.staff_id ? ` (${s.staff.staff_id})` : ''}`,
          amount: Number(s.net_salary || 0), ref: '', paymentMode: 'bank',
        });
      }
    }
    if (sources.donation) {
      for (const v of donations as any[]) {
        const d = (v.created_at || '').split('T')[0];
        out.push({
          id: `don-${v.id}`, date: d, type: 'credit', source: 'donation',
          sourceLabel: bn ? SOURCE_META.donation.bn : SOURCE_META.donation.en,
          institution: '-', category: v.method || '-',
          description: v.note || '-', amount: Number(v.amount || 0),
          ref: v.trx_id || '', paymentMode: normalizeMode(v.method),
        });
      }
    }
    return out;
  }, [expenses, deposits, feePayments, salary, donations, sources, bn, cleanDesc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selInst = expenseInstitutions.find(i => i.id === instFilter);
    const selInstName = selInst ? (bn ? selInst.name_bn : selInst.name) : '';
    const selCat = categories.find((c: any) => c.id === catFilter);
    const selCatName = selCat ? (bn ? selCat.name_bn : selCat.name) : '';
    return rows.filter(r => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (instFilter !== 'all' && r.institution !== selInstName) return false;
      if (catFilter !== 'all' && r.category !== selCatName) return false;
      if (modeFilter !== 'all' && r.paymentMode !== modeFilter) return false;
      if (q && !(r.description.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.institution.toLowerCase().includes(q) || r.paymentMode.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a,b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  }, [rows, typeFilter, instFilter, catFilter, modeFilter, search, expenseInstitutions, categories, bn]);

  const totalCredit = filtered.filter(r => r.type === 'credit').reduce((s, r) => s + r.amount, 0);
  const totalDebit  = filtered.filter(r => r.type === 'debit').reduce((s, r) => s + r.amount, 0);
  const netBalance  = totalCredit - totalDebit;

  const instCats = useMemo(() => {
    if (instFilter === 'all') return categories;
    return categories.filter((c: any) => c.institution_id === instFilter);
  }, [instFilter, categories]);

  const toggleSource = (k: string) => setSources(prev => ({ ...prev, [k]: !prev[k] }));

  // Excel export
  const exportExcel = () => {
    const period = `${displayDate(fromDate)} — ${displayDate(toDate)}`;
    const header = bn
      ? ['#', 'তারিখ', 'টাইপ', 'উৎস', 'প্রতিষ্ঠান', 'ক্যাটেগরি', 'বিবরণ', 'রেফারেন্স', 'ডেবিট (৳)', 'ক্রেডিট (৳)', 'ব্যালেন্স (৳)']
      : ['#', 'Date', 'Type', 'Source', 'Institution', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
    let running = 0;
    const rowsData = filtered.map((r, i) => {
      const debit = r.type === 'debit' ? r.amount : 0;
      const credit = r.type === 'credit' ? r.amount : 0;
      running += credit - debit;
      return [i + 1, displayDate(r.date), (bn ? (r.type==='credit'?'ক্রেডিট':'ডেবিট') : r.type), r.sourceLabel, r.institution, r.category, r.description, r.ref, debit || '', credit || '', running];
    });
    const titleRow = [bn ? 'লেজার / লেনদেন প্রতিবেদন' : 'Ledger / Transaction Report'];
    const periodRow = [bn ? `সময়কাল: ${period}` : `Period: ${period}`];
    const footer = [bn ? 'মোট' : 'Total', '', '', '', '', '', '', '', totalDebit, totalCredit, netBalance];

    const ws = XLSX.utils.aoa_to_sheet([titleRow, periodRow, [], header, ...rowsData, footer]);
    // Header styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const headerRow = 4;
    for (let c = 0; c <= 10; c++) {
      const cell = XLSX.utils.encode_cell({ r: headerRow - 1, c });
      if (ws[cell]) ws[cell].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
    }
    // Title
    if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
    if (ws['A2']) ws['A2'].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: 'center' } };
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ];
    // Data borders + amount alignment
    for (let r = headerRow; r <= headerRow + rowsData.length; r++) {
      for (let c = 0; c <= 10; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        const isAmount = c >= 8;
        const isFooter = r === headerRow + rowsData.length;
        ws[addr].s = {
          font: isFooter ? { bold: true, color: { rgb: 'FFFFFF' } } : {},
          fill: isFooter ? { fgColor: { rgb: '1E293B' } } : (r % 2 === 0 ? { fgColor: { rgb: 'F8FAFC' } } : undefined),
          alignment: { horizontal: isAmount ? 'right' : (c === 0 || c === 1 || c === 2 ? 'center' : 'left'), vertical: 'center' },
          border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }, left: { style: 'thin', color: { rgb: 'CBD5E1' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } },
          numFmt: isAmount ? '#,##0.00;(#,##0.00);-' : undefined,
        };
      }
    }
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 36 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, bn ? 'লেজার' : 'Ledger');
    XLSX.writeFile(wb, `ledger_${fromDate}_${toDate}.xlsx`, { bookType: 'xlsx', cellStyles: true });
  };

  // Print (PDF via browser)
  const printLedger = () => {
    const period = `${displayDate(fromDate)} — ${displayDate(toDate)}`;
    const title = bn ? 'লেজার / লেনদেন প্রতিবেদন' : 'Ledger / Transaction Report';
    let running = 0;
    const bodyRows = filtered.map((r, i) => {
      const debit = r.type === 'debit' ? r.amount : 0;
      const credit = r.type === 'credit' ? r.amount : 0;
      running += credit - debit;
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="text-align:center">${displayDate(r.date)}</td>
        <td style="text-align:center">${r.sourceLabel}</td>
        <td>${r.institution}</td>
        <td>${r.category}</td>
        <td>${r.description}</td>
        <td>${r.ref}</td>
        <td style="text-align:right">${debit ? fmt(debit) : '-'}</td>
        <td style="text-align:right">${credit ? fmt(credit) : '-'}</td>
        <td style="text-align:right">${fmt(running)}</td>
      </tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'SutonnyOMJ','Noto Sans Bengali',Arial,sans-serif; padding: 0; color: #0f172a; }
        h1 { text-align:center; margin: 0 0 4px; font-size: 18px; }
        .period { text-align:center; font-size: 11px; color:#64748b; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        th { background: #1e293b; color: #fff; text-align: center; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tfoot td { background: #1e293b; color: #fff; font-weight: 700; }
      </style></head><body>
      <h1>${title}</h1>
      <div class="period">${bn ? 'সময়কাল' : 'Period'}: ${period}</div>
      <table>
        <thead><tr>
          <th>#</th><th>${bn?'তারিখ':'Date'}</th><th>${bn?'উৎস':'Source'}</th>
          <th>${bn?'প্রতিষ্ঠান':'Institution'}</th><th>${bn?'ক্যাটেগরি':'Category'}</th>
          <th>${bn?'বিবরণ':'Description'}</th><th>${bn?'রেফ':'Ref'}</th>
          <th>${bn?'ডেবিট (৳)':'Debit'}</th><th>${bn?'ক্রেডিট (৳)':'Credit'}</th><th>${bn?'ব্যালেন্স':'Balance'}</th>
        </tr></thead>
        <tbody>${bodyRows || `<tr><td colspan="10" style="text-align:center;padding:16px">${bn?'কোনো তথ্য নেই':'No data'}</td></tr>`}</tbody>
        <tfoot><tr>
          <td colspan="7" style="text-align:right">${bn?'মোট':'Total'}</td>
          <td style="text-align:right">${fmt(totalDebit)}</td>
          <td style="text-align:right">${fmt(totalCredit)}</td>
          <td style="text-align:right">${fmt(netBalance)}</td>
        </tr></tfoot>
      </table>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400)};</script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast.error(bn ? 'পপ-আপ ব্লকড' : 'Popup blocked'); return; }
    w.document.write(html); w.document.close();
  };

  // Running balance for classic view render
  let runningRender = 0;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="rounded-2xl border border-emerald-200/30 dark:border-emerald-800/30 bg-white/60 dark:bg-white/5 backdrop-blur p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
          <ListFilter className="w-4 h-4 text-emerald-600" />
          {bn ? 'ফিল্টার' : 'Filters'}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <Label className="text-xs">{bn ? 'শুরু' : 'From'}</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{bn ? 'শেষ' : 'To'}</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{bn ? 'টাইপ' : 'Type'}</Label>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব' : 'All'}</SelectItem>
                <SelectItem value="credit">{bn ? 'শুধু আয়' : 'Credit only'}</SelectItem>
                <SelectItem value="debit">{bn ? 'শুধু ব্যয়' : 'Debit only'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'প্রতিষ্ঠান' : 'Institution'}</Label>
            <Select value={instFilter} onValueChange={v => { setInstFilter(v); setCatFilter('all'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব' : 'All'}</SelectItem>
                {expenseInstitutions.map(i => (
                  <SelectItem key={i.id} value={i.id}>{bn ? i.name_bn : i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'ক্যাটেগরি' : 'Category'}</Label>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব' : 'All'}</SelectItem>
                {instCats.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'পেমেন্ট মোড' : 'Payment Mode'}</Label>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব' : 'All'}</SelectItem>
                {PAYMENT_MODES.map(m => (
                  <SelectItem key={m} value={m}>{modeLabel(m, bn)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          <div>
            <Label className="text-xs">{bn ? 'সার্চ' : 'Search'}</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={bn ? 'বিবরণ/রেফ' : 'Description/Ref'} />
          </div>
        </div>
        {/* Source chips */}
        <div className="flex flex-wrap gap-2 items-center pt-1">
          <span className="text-xs text-muted-foreground">{bn ? 'উৎস:' : 'Sources:'}</span>
          {Object.entries(SOURCE_META).map(([k, v]) => (
            <button
              key={k}
              onClick={() => toggleSource(k)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${sources[k] ? v.color : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}
            >
              {bn ? v.bn : v.en}
            </button>
          ))}
        </div>
      </div>

      {/* Summary + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <div className="text-[10px] uppercase tracking-wider">{bn ? 'মোট আয়' : 'Total Credit'}</div>
            <div className="text-lg font-bold tabular-nums">৳{fmt(totalCredit)}</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
            <div className="text-[10px] uppercase tracking-wider">{bn ? 'মোট ব্যয়' : 'Total Debit'}</div>
            <div className="text-lg font-bold tabular-nums">৳{fmt(totalDebit)}</div>
          </div>
          <div className={`px-4 py-2 rounded-xl border ${netBalance >= 0 ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <div className="text-[10px] uppercase tracking-wider">{bn ? 'নিট ব্যালেন্স' : 'Net Balance'}</div>
            <div className="text-lg font-bold tabular-nums">৳{fmt(netBalance)}</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div className="text-[10px] uppercase tracking-wider">{bn ? 'এন্ট্রি' : 'Entries'}</div>
            <div className="text-lg font-bold tabular-nums">{filtered.length}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden">
            <button onClick={() => setViewMode('simple')} className={`px-3 py-1.5 text-xs font-medium ${viewMode==='simple' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <ArrowDownUp className="w-3.5 h-3.5 inline mr-1" />{bn ? 'সরল তালিকা' : 'Simple'}
            </button>
            <button onClick={() => setViewMode('classic')} className={`px-3 py-1.5 text-xs font-medium ${viewMode==='classic' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {bn ? 'ক্লাসিক লেজার' : 'Classic Ledger'}
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={printLedger}><Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট / PDF' : 'Print / PDF'}</Button>
          <Button size="sm" variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}</Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-300 overflow-auto bg-white rounded">
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-sm">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>
        ) : viewMode === 'simple' ? (
          <table className="w-full border-collapse text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-10">#</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-24">{bn ? 'তারিখ' : 'Date'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-20">{bn ? 'টাইপ' : 'Type'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-24">{bn ? 'উৎস' : 'Source'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">{bn ? 'প্রতিষ্ঠান' : 'Institution'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">{bn ? 'ক্যাটেগরি' : 'Category'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">{bn ? 'বিবরণ' : 'Description'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-28">{bn ? 'রেফ' : 'Ref'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold w-32">{bn ? 'টাকা (৳)' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="border border-slate-300 px-3 py-8 text-center text-slate-500">{bn ? 'কোনো তথ্য নেই' : 'No entries'}</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{i+1}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{displayDate(r.date)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.type==='credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {r.type==='credit' ? (bn?'ক্রেডিট':'CR') : (bn?'ডেবিট':'DR')}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${SOURCE_META[r.source]?.color || ''}`}>{r.sourceLabel}</span>
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-left truncate">{r.institution}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-left truncate">{r.category}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-left">{r.description}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-left text-xs text-slate-500">{r.ref || '-'}</td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-right tabular-nums font-medium ${r.type==='credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.type==='credit' ? '+' : '−'}৳{fmt(r.amount)}
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan={8} className="border border-slate-700 px-3 py-2 text-right">{bn ? 'নিট ব্যালেন্স:' : 'Net Balance:'}</td>
                  <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">৳{fmt(netBalance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-10">#</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-24">{bn ? 'তারিখ' : 'Date'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">{bn ? 'বিবরণ' : 'Particulars'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold w-32">{bn ? 'ডেবিট (৳)' : 'Debit'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold w-32">{bn ? 'ক্রেডিট (৳)' : 'Credit'}</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold w-32">{bn ? 'ব্যালেন্স (৳)' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="border border-slate-300 px-3 py-8 text-center text-slate-500">{bn ? 'কোনো তথ্য নেই' : 'No entries'}</td></tr>
              ) : filtered.map((r, i) => {
                const debit = r.type === 'debit' ? r.amount : 0;
                const credit = r.type === 'credit' ? r.amount : 0;
                runningRender += credit - debit;
                const balance = runningRender;
                return (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{i+1}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{displayDate(r.date)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${SOURCE_META[r.source]?.color || ''}`}>{r.sourceLabel}</span>
                        <span className="truncate">{r.description}</span>
                        {r.ref && <span className="text-[10px] text-slate-400">[{r.ref}]</span>}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-rose-600">{debit ? fmt(debit) : '-'}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-emerald-600">{credit ? fmt(credit) : '-'}</td>
                    <td className={`border border-slate-300 px-2 py-1.5 text-right tabular-nums font-medium ${balance >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>{fmt(balance)}</td>
                  </tr>
                );
              })}
              {filtered.length > 0 && (
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan={3} className="border border-slate-700 px-3 py-2 text-right">{bn ? 'মোট:' : 'Total:'}</td>
                  <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">৳{fmt(totalDebit)}</td>
                  <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">৳{fmt(totalCredit)}</td>
                  <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">৳{fmt(netBalance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
