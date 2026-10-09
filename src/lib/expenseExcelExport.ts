import XLSX from 'xlsx-js-style';

interface ExpenseItem {
  id: string;
  month_year: string;
  amount: number | string;
  institution_id?: string | null;
  category_id?: string | null;
  expense_date: string;
  description?: string | null;
  quantity?: number | string | null;
  has_receipt?: boolean | null;
  receipt_url?: string | null;
  expense_institutions?: { name?: string; name_bn?: string } | null;
  expense_categories?: { name?: string; name_bn?: string } | null;
}

interface ExportExcelParams {
  institutionName: string;
  reportPeriod: string;
  selectedMonthYear: string;
  institutions: { id: string; name: string; name_bn: string }[];
  categories: { id: string; name: string; name_bn: string; institution_id?: string }[];
  expenses: ExpenseItem[];
  unpaidDues: ExpenseItem[];
  monthlyTotalExpense: number;
  monthlyTotalDeposit: number;
  previousArrears: number;
  monthlyCash: number;
  deposits: any[];
  bn: boolean;
  cleanDesc: (d: string) => string;
  getUnit: (d: string) => string;
  getMethod: (d: string) => string;
  getMemo: (d: string) => string;
  getRemarks: (d: string) => string;
  formatNum: (n: number) => string;
}

// Sanitize sheet names to conform to Excel limits (max 31 chars, no reserved chars)
const sanitizeSheetName = (name: string, usedNames: Set<string>): string => {
  let clean = (name || 'Sheet')
    .replace(/[\\/?*[\]:]/g, '')
    .trim()
    .substring(0, 28);
  if (!clean) clean = 'Sheet';

  let candidate = clean;
  let counter = 1;
  while (usedNames.has(candidate)) {
    candidate = `${clean.substring(0, 25)} (${counter})`;
    counter++;
  }
  usedNames.add(candidate);
  return candidate;
};

// Styling definitions
const STYLES = {
  mainTitle: {
    font: { name: 'Noto Sans Bengali', sz: 14, bold: true, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'left' },
  },
  subTitle: {
    font: { name: 'Noto Sans Bengali', sz: 10, italic: true, color: { rgb: '64748B' } },
    alignment: { vertical: 'center', horizontal: 'left' },
  },
  sectionTitle: {
    font: { name: 'Noto Sans Bengali', sz: 11, bold: true, color: { rgb: '047857' } },
    fill: { fgColor: { rgb: 'ECFDF5' } },
    border: {
      top: { style: 'thin', color: { rgb: 'A7F3D0' } },
      bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
      left: { style: 'thin', color: { rgb: 'A7F3D0' } },
      right: { style: 'thin', color: { rgb: 'A7F3D0' } },
    },
    alignment: { vertical: 'center', horizontal: 'left' },
  },
  header: {
    font: { name: 'Noto Sans Bengali', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } }, // Emerald 600
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } },
    },
    alignment: { vertical: 'center', horizontal: 'center' },
  },
  dueHeader: {
    font: { name: 'Noto Sans Bengali', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'D97706' } }, // Amber 600
    border: {
      top: { style: 'thin', color: { rgb: 'B45309' } },
      bottom: { style: 'thin', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'B45309' } },
      right: { style: 'thin', color: { rgb: 'B45309' } },
    },
    alignment: { vertical: 'center', horizontal: 'center' },
  },
  cellText: {
    font: { name: 'Noto Sans Bengali', sz: 9, color: { rgb: '1E293B' } },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
    alignment: { vertical: 'center', horizontal: 'left' },
  },
  cellCenter: {
    font: { name: 'Noto Sans Bengali', sz: 9, color: { rgb: '1E293B' } },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
    alignment: { vertical: 'center', horizontal: 'center' },
  },
  cellMoney: {
    font: { name: 'Noto Sans Bengali', sz: 9, bold: true, color: { rgb: '0F172A' } },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
    alignment: { vertical: 'center', horizontal: 'right' },
    numFmt: '#,##0.00',
  },
  totalRowLabel: {
    font: { name: 'Noto Sans Bengali', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    border: {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
    },
  },
  totalRowMoney: {
    font: { name: 'Noto Sans Bengali', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    numFmt: '#,##0.00',
    border: {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
    },
  },
};

/**
 * Creates styled worksheet from array of cells with metadata
 */
function createStyledSheet(rows: any[][], colWidths: number[] = []) {
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => (c && typeof c === 'object' && 'v' in c ? c.v : c))));

  // Apply cell styling
  rows.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!ws[cellRef]) return;
      if (cell && typeof cell === 'object' && cell.s) {
        ws[cellRef].s = cell.s;
        if (cell.z) ws[cellRef].z = cell.z;
      }
    });
  });

  if (colWidths.length > 0) {
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
  }

  return ws;
}

/**
 * Export all expenses into a unified workbook with separate Category tabs
 */
export function exportExpensesMultiTabExcel(params: ExportExcelParams) {
  const {
    institutionName,
    reportPeriod,
    selectedMonthYear,
    institutions,
    categories,
    expenses,
    unpaidDues,
    monthlyTotalExpense,
    monthlyTotalDeposit,
    previousArrears,
    monthlyCash,
    bn,
    cleanDesc,
    getUnit,
    getMethod,
    getMemo,
    getRemarks,
  } = params;

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Filter regular paid expenses (excluding active unpaid dues)
  const paidExpenses = expenses.filter(e => !e.description?.includes('[due:unpaid]'));

  // =========================================================================
  // TAB 1: সার্বিক সারসংক্ষেপ (Overview / Summary Sheet)
  // =========================================================================
  const summaryRows: any[][] = [];

  // Title block
  summaryRows.push([
    { v: institutionName, s: STYLES.mainTitle },
    '', '', '', '',
  ]);
  summaryRows.push([
    { v: `${bn ? 'হিসাব সারসংক্ষেপ' : 'Expense Summary Report'} - ${reportPeriod}`, s: STYLES.subTitle },
    '', '', '', '',
  ]);
  summaryRows.push([]);

  // Overall Financial Metric Boxes
  summaryRows.push([
    { v: bn ? 'আর্থিক পরিস্থিতি সারাংশ' : 'Financial Status Overview', s: STYLES.sectionTitle },
    '', '', '', '',
  ]);
  summaryRows.push([
    { v: bn ? 'বিবরণ' : 'Description', s: STYLES.header },
    { v: bn ? 'টাকা (৳)' : 'Amount (BDT)', s: STYLES.header },
    '', '', '',
  ]);

  const totalUnpaidDues = unpaidDues.reduce((s, d) => s + Number(d.amount || 0), 0);

  summaryRows.push([
    { v: bn ? 'মোট জমা / আয়' : 'Total Deposits', s: STYLES.cellText },
    { v: monthlyTotalDeposit, s: STYLES.cellMoney },
  ]);
  summaryRows.push([
    { v: bn ? 'মোট পরিশোধিত ব্যয়' : 'Total Paid Expenses', s: STYLES.cellText },
    { v: monthlyTotalExpense, s: STYLES.cellMoney },
  ]);
  summaryRows.push([
    { v: bn ? 'মোট বকেয়া দায়' : 'Total Outstanding Dues', s: STYLES.cellText },
    { v: totalUnpaidDues, s: STYLES.cellMoney },
  ]);
  summaryRows.push([
    { v: bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears', s: STYLES.cellText },
    { v: previousArrears, s: STYLES.cellMoney },
  ]);
  summaryRows.push([
    { v: bn ? 'চলতি ক্যাশ স্থিতি' : 'Net Cash Balance', s: STYLES.totalRowLabel },
    { v: monthlyCash, s: STYLES.totalRowMoney },
  ]);

  summaryRows.push([]);
  summaryRows.push([]);

  // Institution-wise Breakdown in Summary Sheet
  summaryRows.push([
    { v: bn ? 'প্রতিষ্ঠান ভিত্তিক ব্যয়ের সারসংক্ষেপ' : 'Institution-wise Breakdown', s: STYLES.sectionTitle },
    '', '', '', '',
  ]);
  summaryRows.push([
    { v: '#', s: STYLES.header },
    { v: bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name', s: STYLES.header },
    { v: bn ? 'নগদ খরচ (৳)' : 'Cash Expense', s: STYLES.header },
    { v: bn ? 'বকেয়া খরচ (৳)' : 'Due Expense', s: STYLES.header },
    { v: bn ? 'সর্বমোট (৳)' : 'Total (BDT)', s: STYLES.header },
  ]);

  let totalInstCash = 0;
  let totalInstDue = 0;

  institutions.forEach((inst, i) => {
    const instPaid = paidExpenses.filter(e => e.institution_id === inst.id);
    const instCashTotal = instPaid.reduce((s, e) => s + Number(e.amount || 0), 0);
    const instDue = unpaidDues.filter(e => e.institution_id === inst.id);
    const instDueTotal = instDue.reduce((s, e) => s + Number(e.amount || 0), 0);
    const instCombined = instCashTotal + instDueTotal;

    totalInstCash += instCashTotal;
    totalInstDue += instDueTotal;

    summaryRows.push([
      { v: i + 1, s: STYLES.cellCenter },
      { v: bn ? inst.name_bn || inst.name : inst.name, s: STYLES.cellText },
      { v: instCashTotal, s: STYLES.cellMoney },
      { v: instDueTotal, s: STYLES.cellMoney },
      { v: instCombined, s: STYLES.cellMoney },
    ]);
  });

  summaryRows.push([
    { v: '', s: STYLES.totalRowLabel },
    { v: bn ? 'সর্বমোট প্রতিষ্ঠান ব্যয়:' : 'Total Institutional:', s: STYLES.totalRowLabel },
    { v: totalInstCash, s: STYLES.totalRowMoney },
    { v: totalInstDue, s: STYLES.totalRowMoney },
    { v: totalInstCash + totalInstDue, s: STYLES.totalRowMoney },
  ]);

  summaryRows.push([]);
  summaryRows.push([]);

  // Category-wise Breakdown in Summary Sheet
  summaryRows.push([
    { v: bn ? 'ক্যাটাগরি ভিত্তিক ব্যয়ের সারসংক্ষেপ' : 'Category-wise Breakdown', s: STYLES.sectionTitle },
    '', '', '',
  ]);
  summaryRows.push([
    { v: '#', s: STYLES.header },
    { v: bn ? 'ক্যাটাগরির নাম' : 'Category Name', s: STYLES.header },
    { v: bn ? 'মোট ব্যয় (৳)' : 'Total Expense', s: STYLES.header },
    { v: bn ? 'শতকরা হার (%)' : 'Percentage (%)', s: STYLES.header },
  ]);

  let catIdx = 1;
  categories.forEach(cat => {
    const catExpenses = paidExpenses.filter(e => e.category_id === cat.id);
    const catTotal = catExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    if (catTotal === 0) return;

    const percent = monthlyTotalExpense > 0 ? (catTotal / monthlyTotalExpense) * 100 : 0;

    summaryRows.push([
      { v: catIdx++, s: STYLES.cellCenter },
      { v: bn ? cat.name_bn || cat.name : cat.name, s: STYLES.cellText },
      { v: catTotal, s: STYLES.cellMoney },
      { v: `${percent.toFixed(1)}%`, s: STYLES.cellCenter },
    ]);
  });

  summaryRows.push([
    { v: '', s: STYLES.totalRowLabel },
    { v: bn ? 'সর্বমোট ক্যাটাগরি ব্যয়:' : 'Total Category Expense:', s: STYLES.totalRowLabel },
    { v: monthlyTotalExpense, s: STYLES.totalRowMoney },
    { v: '100%', s: STYLES.totalRowMoney },
  ]);

  const summarySheetName = sanitizeSheetName(bn ? 'সারসংক্ষেপ' : 'Summary', usedSheetNames);
  const wsSummary = createStyledSheet(summaryRows, [6, 32, 18, 18, 20]);
  XLSX.utils.book_append_sheet(wb, wsSummary, summarySheetName);

  // =========================================================================
  // TABS 2..N: প্রতিটি ক্যাটাগরির জন্য আলাদা আলাদা ট্যাব (Category Worksheets)
  // =========================================================================
  // Process all categories that have expenses
  categories.forEach(cat => {
    const catExpenses = paidExpenses.filter(e => e.category_id === cat.id);
    if (catExpenses.length === 0) return;

    const catName = bn ? cat.name_bn || cat.name : cat.name;
    const sheetName = sanitizeSheetName(catName, usedSheetNames);

    const catRows: any[][] = [];

    // Header info
    catRows.push([
      { v: `${institutionName} - ${catName}`, s: STYLES.mainTitle },
      '', '', '', '', '', '', '', '',
    ]);
    catRows.push([
      { v: `${bn ? 'হিসাবের সময়কাল' : 'Period'}: ${reportPeriod} | ${bn ? 'ক্যাটাগরি' : 'Category'}: ${catName}`, s: STYLES.subTitle },
      '', '', '', '', '', '', '', '',
    ]);
    catRows.push([]);

    // Table Column Headers
    catRows.push([
      { v: '#', s: STYLES.header },
      { v: bn ? 'তারিখ' : 'Date', s: STYLES.header },
      { v: bn ? 'প্রতিষ্ঠান' : 'Institution', s: STYLES.header },
      { v: bn ? 'ব্যয়ের বিবরণ' : 'Description', s: STYLES.header },
      { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.header },
      { v: bn ? 'ব্যয়ের মাধ্যম' : 'Method', s: STYLES.header },
      { v: bn ? 'মেমো / রশিদ নং' : 'Memo/Receipt #', s: STYLES.header },
      { v: bn ? 'ব্যয় টাকা (৳)' : 'Amount (BDT)', s: STYLES.header },
      { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.header },
    ]);

    let catSubTotal = 0;
    catExpenses.forEach((exp, idx) => {
      const amt = Number(exp.amount || 0);
      catSubTotal += amt;

      const instObj = institutions.find(i => i.id === exp.institution_id);
      const instName = instObj ? (bn ? instObj.name_bn || instObj.name : instObj.name) : '-';
      const rawQty = exp.quantity ? String(exp.quantity) : '১';
      const unit = getUnit(exp.description || '');
      const displayQty = `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি/পিস' : 'pcs')}`;

      catRows.push([
        { v: idx + 1, s: STYLES.cellCenter },
        { v: exp.expense_date, s: STYLES.cellCenter },
        { v: instName, s: STYLES.cellText },
        { v: cleanDesc(exp.description || ''), s: STYLES.cellText },
        { v: displayQty, s: STYLES.cellCenter },
        { v: getMethod(exp.description || ''), s: STYLES.cellCenter },
        { v: getMemo(exp.description || ''), s: STYLES.cellCenter },
        { v: amt, s: STYLES.cellMoney },
        { v: getRemarks(exp.description || ''), s: STYLES.cellText },
      ]);
    });

    // Subtotal Row
    catRows.push([
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: bn ? 'মোট ব্যয়:' : 'Total Amount:', s: STYLES.totalRowLabel },
      { v: catSubTotal, s: STYLES.totalRowMoney },
      { v: '', s: STYLES.totalRowMoney },
    ]);

    const wsCat = createStyledSheet(catRows, [6, 14, 22, 34, 14, 14, 16, 18, 25]);
    XLSX.utils.book_append_sheet(wb, wsCat, sheetName);
  });

  // =========================================================================
  // TAB LAST: বকেয়া হিসাব (Dues / Outstanding Payables Sheet)
  // =========================================================================
  const dueRows: any[][] = [];

  dueRows.push([
    { v: `${institutionName} - ${bn ? 'বকেয়া খরচের হিসাব' : 'Outstanding Expenses Report'}`, s: STYLES.mainTitle },
    '', '', '', '', '', '', '', '', '',
  ]);
  dueRows.push([
    { v: `${bn ? 'হিসাবের সময়কাল' : 'Period'}: ${reportPeriod}`, s: STYLES.subTitle },
    '', '', '', '', '', '', '', '', '',
  ]);
  dueRows.push([]);

  dueRows.push([
    { v: '#', s: STYLES.dueHeader },
    { v: bn ? 'বকেয়ার তারিখ' : 'Due Date', s: STYLES.dueHeader },
    { v: bn ? 'প্রতিষ্ঠান' : 'Institution', s: STYLES.dueHeader },
    { v: bn ? 'ক্যাটাগরি' : 'Category', s: STYLES.dueHeader },
    { v: bn ? 'ব্যয়ের বিবরণ ও পাওনাদার' : 'Description & Vendor', s: STYLES.dueHeader },
    { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.dueHeader },
    { v: bn ? 'মেমো / চালান নং' : 'Memo/Invoice #', s: STYLES.dueHeader },
    { v: bn ? 'বকেয়া টাকা (৳)' : 'Due Amount (BDT)', s: STYLES.dueHeader },
    { v: bn ? 'অবস্থা' : 'Status', s: STYLES.dueHeader },
    { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.dueHeader },
  ]);

  if (unpaidDues.length === 0) {
    dueRows.push([
      { v: 1, s: STYLES.cellCenter },
      { v: '-', s: STYLES.cellCenter },
      { v: '-', s: STYLES.cellCenter },
      { v: '-', s: STYLES.cellCenter },
      { v: bn ? 'কোনো বকেয়া খরচ নেই' : 'No outstanding dues', s: STYLES.cellText },
      { v: '-', s: STYLES.cellCenter },
      { v: '-', s: STYLES.cellCenter },
      { v: 0, s: STYLES.cellMoney },
      { v: bn ? 'পরিশোধিত' : 'Clear', s: STYLES.cellCenter },
      { v: '-', s: STYLES.cellText },
    ]);
  } else {
    unpaidDues.forEach((due, dIdx) => {
      const amt = Number(due.amount || 0);
      const instObj = institutions.find(i => i.id === due.institution_id);
      const catObj = categories.find(c => c.id === due.category_id);
      const instName = instObj ? (bn ? instObj.name_bn || instObj.name : instObj.name) : '-';
      const catName = catObj ? (bn ? catObj.name_bn || catObj.name : catObj.name) : '-';
      const rawQty = due.quantity ? String(due.quantity) : '১';
      const unit = getUnit(due.description || '');
      const displayQty = `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি/পিস' : 'pcs')}`;

      dueRows.push([
        { v: dIdx + 1, s: STYLES.cellCenter },
        { v: due.expense_date, s: STYLES.cellCenter },
        { v: instName, s: STYLES.cellText },
        { v: catName, s: STYLES.cellText },
        { v: cleanDesc(due.description || ''), s: STYLES.cellText },
        { v: displayQty, s: STYLES.cellCenter },
        { v: getMemo(due.description || ''), s: STYLES.cellCenter },
        { v: amt, s: STYLES.cellMoney },
        { v: bn ? 'বকেয়া' : 'Due', s: STYLES.cellCenter },
        { v: getRemarks(due.description || ''), s: STYLES.cellText },
      ]);
    });
  }

  // Dues total row
  dueRows.push([
    { v: '', s: STYLES.totalRowLabel },
    { v: '', s: STYLES.totalRowLabel },
    { v: '', s: STYLES.totalRowLabel },
    { v: '', s: STYLES.totalRowLabel },
    { v: '', s: STYLES.totalRowLabel },
    { v: '', s: STYLES.totalRowLabel },
    { v: bn ? 'মোট বকেয়া:' : 'Total Due:', s: STYLES.totalRowLabel },
    { v: totalUnpaidDues, s: STYLES.totalRowMoney },
    { v: '', s: STYLES.totalRowMoney },
    { v: '', s: STYLES.totalRowMoney },
  ]);

  const dueSheetName = sanitizeSheetName(bn ? 'বকেয়া হিসাব' : 'Due Expenses', usedSheetNames);
  const wsDues = createStyledSheet(dueRows, [6, 14, 20, 20, 32, 14, 16, 18, 12, 25]);
  XLSX.utils.book_append_sheet(wb, wsDues, dueSheetName);

  // Write file
  const fileName = `Expense_Report_${selectedMonthYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export a single selected institution's expenses with its categories as separate sheets
 */
export function exportSingleInstitutionExcel(params: ExportExcelParams & { selectedInstId: string }) {
  const {
    selectedInstId,
    institutionName,
    reportPeriod,
    selectedMonthYear,
    institutions,
    categories,
    expenses,
    unpaidDues,
    bn,
    cleanDesc,
    getUnit,
    getMethod,
    getMemo,
    getRemarks,
  } = params;

  const inst = institutions.find(i => i.id === selectedInstId);
  if (!inst) return;

  const targetInstName = bn ? inst.name_bn || inst.name : inst.name;
  const instExpenses = expenses.filter(e => e.institution_id === selectedInstId && !e.description?.includes('[due:unpaid]'));
  const instDues = unpaidDues.filter(e => e.institution_id === selectedInstId);

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Summary sheet for this institution
  const summaryRows: any[][] = [
    [{ v: `${institutionName} - ${targetInstName}`, s: STYLES.mainTitle }, '', '', ''],
    [{ v: `${bn ? 'হিসাব সারসংক্ষেপ' : 'Expense Summary'} - ${reportPeriod}`, s: STYLES.subTitle }, '', '', ''],
    [],
    [{ v: '#', s: STYLES.header }, { v: bn ? 'ক্যাটাগরি' : 'Category', s: STYLES.header }, { v: bn ? 'ব্যয় টাকা (৳)' : 'Amount (BDT)', s: STYLES.header }, { v: bn ? 'শতকরা (%)' : '%', s: STYLES.header }],
  ];

  const instTotal = instExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  let cIdx = 1;

  const instCategories = categories.filter(c => c.institution_id === selectedInstId);
  instCategories.forEach(cat => {
    const catExpenses = instExpenses.filter(e => e.category_id === cat.id);
    const catTotal = catExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    if (catTotal === 0) return;

    const percent = instTotal > 0 ? (catTotal / instTotal) * 100 : 0;
    summaryRows.push([
      { v: cIdx++, s: STYLES.cellCenter },
      { v: bn ? cat.name_bn || cat.name : cat.name, s: STYLES.cellText },
      { v: catTotal, s: STYLES.cellMoney },
      { v: `${percent.toFixed(1)}%`, s: STYLES.cellCenter },
    ]);
  });

  summaryRows.push([
    { v: '', s: STYLES.totalRowLabel },
    { v: bn ? 'মোট ব্যয়:' : 'Total Amount:', s: STYLES.totalRowLabel },
    { v: instTotal, s: STYLES.totalRowMoney },
    { v: '100%', s: STYLES.totalRowMoney },
  ]);

  const wsSum = createStyledSheet(summaryRows, [6, 28, 18, 14]);
  XLSX.utils.book_append_sheet(wb, wsSum, sanitizeSheetName(bn ? 'সারসংক্ষেপ' : 'Summary', usedSheetNames));

  // Category sheets for this institution
  instCategories.forEach(cat => {
    const catExpenses = instExpenses.filter(e => e.category_id === cat.id);
    if (catExpenses.length === 0) return;

    const catName = bn ? cat.name_bn || cat.name : cat.name;
    const catRows: any[][] = [
      [{ v: `${targetInstName} - ${catName}`, s: STYLES.mainTitle }, '', '', '', '', '', '', ''],
      [{ v: `${reportPeriod}`, s: STYLES.subTitle }, '', '', '', '', '', '', ''],
      [],
      [
        { v: '#', s: STYLES.header },
        { v: bn ? 'তারিখ' : 'Date', s: STYLES.header },
        { v: bn ? 'ব্যয়ের বিবরণ' : 'Description', s: STYLES.header },
        { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.header },
        { v: bn ? 'ব্যয়ের মাধ্যম' : 'Method', s: STYLES.header },
        { v: bn ? 'মেমো / রশিদ নং' : 'Memo/Receipt #', s: STYLES.header },
        { v: bn ? 'ব্যয় টাকা (৳)' : 'Amount', s: STYLES.header },
        { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.header },
      ],
    ];

    let catTotal = 0;
    catExpenses.forEach((exp, idx) => {
      const amt = Number(exp.amount || 0);
      catTotal += amt;
      const rawQty = exp.quantity ? String(exp.quantity) : '১';
      const unit = getUnit(exp.description || '');
      const displayQty = `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি/পিস' : 'pcs')}`;

      catRows.push([
        { v: idx + 1, s: STYLES.cellCenter },
        { v: exp.expense_date, s: STYLES.cellCenter },
        { v: cleanDesc(exp.description || ''), s: STYLES.cellText },
        { v: displayQty, s: STYLES.cellCenter },
        { v: getMethod(exp.description || ''), s: STYLES.cellCenter },
        { v: getMemo(exp.description || ''), s: STYLES.cellCenter },
        { v: amt, s: STYLES.cellMoney },
        { v: getRemarks(exp.description || ''), s: STYLES.cellText },
      ]);
    });

    catRows.push([
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: bn ? 'মোট:' : 'Total:', s: STYLES.totalRowLabel },
      { v: catTotal, s: STYLES.totalRowMoney },
      { v: '', s: STYLES.totalRowMoney },
    ]);

    const wsC = createStyledSheet(catRows, [6, 14, 34, 14, 14, 16, 18, 25]);
    XLSX.utils.book_append_sheet(wb, wsC, sanitizeSheetName(catName, usedSheetNames));
  });

  // Dues sheet for this institution
  if (instDues.length > 0) {
    const dueRows: any[][] = [
      [{ v: `${targetInstName} - ${bn ? 'বকেয়া হিসাব' : 'Due Expenses'}`, s: STYLES.mainTitle }, '', '', '', '', '', '', ''],
      [{ v: reportPeriod, s: STYLES.subTitle }, '', '', '', '', '', '', ''],
      [],
      [
        { v: '#', s: STYLES.dueHeader },
        { v: bn ? 'তারিখ' : 'Date', s: STYLES.dueHeader },
        { v: bn ? 'বিবরণ ও পাওনাদার' : 'Description', s: STYLES.dueHeader },
        { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.dueHeader },
        { v: bn ? 'মেমো নং' : 'Memo #', s: STYLES.dueHeader },
        { v: bn ? 'বকেয়া টাকা (৳)' : 'Due Amount', s: STYLES.dueHeader },
        { v: bn ? 'অবস্থা' : 'Status', s: STYLES.dueHeader },
        { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.dueHeader },
      ],
    ];

    let totalDue = 0;
    instDues.forEach((d, idx) => {
      const amt = Number(d.amount || 0);
      totalDue += amt;
      const rawQty = d.quantity ? String(d.quantity) : '১';
      const unit = getUnit(d.description || '');
      dueRows.push([
        { v: idx + 1, s: STYLES.cellCenter },
        { v: d.expense_date, s: STYLES.cellCenter },
        { v: cleanDesc(d.description || ''), s: STYLES.cellText },
        { v: `${rawQty} ${unit}`, s: STYLES.cellCenter },
        { v: getMemo(d.description || ''), s: STYLES.cellCenter },
        { v: amt, s: STYLES.cellMoney },
        { v: bn ? 'বকেয়া' : 'Due', s: STYLES.cellCenter },
        { v: getRemarks(d.description || ''), s: STYLES.cellText },
      ]);
    });

    dueRows.push([
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: '', s: STYLES.totalRowLabel },
      { v: bn ? 'মোট বকেয়া:' : 'Total Due:', s: STYLES.totalRowLabel },
      { v: totalDue, s: STYLES.totalRowMoney },
      { v: '', s: STYLES.totalRowMoney },
      { v: '', s: STYLES.totalRowMoney },
    ]);

    const wsD = createStyledSheet(dueRows, [6, 14, 34, 14, 16, 18, 12, 25]);
    XLSX.utils.book_append_sheet(wb, wsD, sanitizeSheetName(bn ? 'বকেয়া হিসাব' : 'Due Expenses', usedSheetNames));
  }

  const fileName = `${targetInstName}_ব্যয়_${selectedMonthYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
