import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ExpenseRow {
  id: string;
  amount: number | string;
  expense_date: string;
  description?: string | null;
  institution_id?: string | null;
  category_id?: string | null;
  expense_institutions?: { name?: string; name_bn?: string } | null;
  expense_categories?: { name?: string; name_bn?: string } | null;
}

interface Props {
  expenses: ExpenseRow[];
  bn: boolean;
  formatNum: (n: number) => string;
  cleanDesc: (d: string) => string;
  periodLabel?: string;
}

const ExpenseHierarchyReport = ({ expenses, bn, formatNum, cleanDesc, periodLabel }: Props) => {
  const [openInst, setOpenInst] = useState<Record<string, boolean>>({});
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => {
    const inst: Record<string, {
      id: string; name: string; name_bn: string; total: number;
      cats: Record<string, { id: string; name: string; name_bn: string; total: number; items: ExpenseRow[] }>;
    }> = {};
    expenses.forEach(e => {
      const iid = e.institution_id || '__none__';
      const cid = e.category_id || '__none__';
      if (!inst[iid]) {
        inst[iid] = {
          id: iid,
          name: e.expense_institutions?.name || (bn ? 'অজ্ঞাত প্রতিষ্ঠান' : 'Unknown'),
          name_bn: e.expense_institutions?.name_bn || (bn ? 'অজ্ঞাত প্রতিষ্ঠান' : 'Unknown'),
          total: 0,
          cats: {},
        };
      }
      if (!inst[iid].cats[cid]) {
        inst[iid].cats[cid] = {
          id: cid,
          name: e.expense_categories?.name || (bn ? 'অজ্ঞাত ক্যাটেগরি' : 'Uncategorized'),
          name_bn: e.expense_categories?.name_bn || (bn ? 'অজ্ঞাত ক্যাটেগরি' : 'Uncategorized'),
          total: 0,
          items: [],
        };
      }
      const amt = Number(e.amount || 0);
      inst[iid].total += amt;
      inst[iid].cats[cid].total += amt;
      inst[iid].cats[cid].items.push(e);
    });
    return Object.values(inst)
      .map(i => ({
        ...i,
        cats: Object.values(i.cats).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, bn]);

  const grandTotal = tree.reduce((s, i) => s + i.total, 0);

  const toggleInst = (id: string) => setOpenInst(p => ({ ...p, [id]: !p[id] }));
  const toggleCat = (id: string) => setOpenCat(p => ({ ...p, [id]: !p[id] }));

  const formatDate = (d: string) => {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    if (!y) return d;
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="border border-slate-300 overflow-auto bg-white">
      <table className="w-full border-collapse text-sm text-slate-700" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '48px' }} />
          <col />
          <col style={{ width: '140px' }} />
          <col style={{ width: '160px' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            <th className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-800"></th>
            <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-800">
              {bn ? 'প্রতিষ্ঠান / ক্যাটেগরি / বিবরণ' : 'Institution / Category / Description'}
            </th>
            <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-800">
              {bn ? 'তারিখ' : 'Date'}
            </th>
            <th className="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-800">
              {bn ? 'পরিমাণ (৳)' : 'Amount (৳)'}
            </th>
          </tr>
        </thead>
        <tbody>
          {tree.length === 0 && (
            <tr>
              <td colSpan={4} className="border border-slate-300 px-3 py-6 text-center text-slate-500">
                {bn ? 'কোনো তথ্য নেই' : 'No data'}
              </td>
            </tr>
          )}
          {tree.map((inst, ii) => {
            const iOpen = !!openInst[inst.id];
            return (
              <>
                {/* Level 1: Institution */}
                <tr
                  key={`i-${inst.id}`}
                  className="bg-slate-200/70 hover:bg-slate-200 cursor-pointer font-semibold"
                  onClick={() => toggleInst(inst.id)}
                >
                  <td className="border border-slate-300 px-2 py-2 text-center align-middle">
                    {iOpen ? <ChevronDown className="w-4 h-4 inline text-slate-700" /> : <ChevronRight className="w-4 h-4 inline text-slate-700" />}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-left text-slate-900 truncate">
                    {bn ? inst.name_bn : inst.name}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-left text-slate-500 text-xs">
                    {bn ? `${inst.cats.length}টি ক্যাটেগরি` : `${inst.cats.length} categories`}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right tabular-nums text-slate-900">
                    ৳{formatNum(inst.total)}
                  </td>
                </tr>

                {iOpen && inst.cats.map((cat, ci) => {
                  const cKey = `${inst.id}::${cat.id}`;
                  const cOpen = !!openCat[cKey];
                  return (
                    <>
                      {/* Level 2: Category */}
                      <tr
                        key={`c-${cKey}`}
                        className={`${ci % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 cursor-pointer`}
                        onClick={() => toggleCat(cKey)}
                      >
                        <td className="border border-slate-300 px-2 py-1.5 text-center align-middle">
                          {cOpen ? <ChevronDown className="w-3.5 h-3.5 inline text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 inline text-slate-500" />}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-left text-slate-700" style={{ paddingLeft: '2rem' }}>
                          {bn ? cat.name_bn : cat.name}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-left text-slate-500 text-xs">
                          {bn ? `${cat.items.length}টি এন্ট্রি` : `${cat.items.length} entries`}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums font-medium text-slate-800">
                          ৳{formatNum(cat.total)}
                        </td>
                      </tr>

                      {cOpen && cat.items.map((it, ri) => (
                        <tr
                          key={`e-${it.id}`}
                          className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          <td className="border border-slate-300 px-2 py-1.5"></td>
                          <td className="border border-slate-300 px-3 py-1.5 text-left text-slate-600" style={{ paddingLeft: '3.5rem' }}>
                            {cleanDesc(it.description || '')}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-left text-slate-600 tabular-nums">
                            {formatDate(it.expense_date)}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums text-slate-700">
                            ৳{formatNum(Number(it.amount || 0))}
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </>
            );
          })}
          {tree.length > 0 && (
            <tr className="bg-slate-800 text-white font-bold">
              <td className="border border-slate-700 px-2 py-2"></td>
              <td className="border border-slate-700 px-3 py-2 text-left">
                {bn ? 'সর্বমোট' : 'Grand Total'}{periodLabel ? ` — ${periodLabel}` : ''}
              </td>
              <td className="border border-slate-700 px-3 py-2"></td>
              <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">
                ৳{formatNum(grandTotal)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExpenseHierarchyReport;
