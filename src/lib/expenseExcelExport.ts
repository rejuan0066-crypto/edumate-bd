import XLSX from 'xlsx-js-style';

export interface ExpenseItem {
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

export interface ExportExcelParams {
  institutionName: string;
  reportPeriod: string;
  selectedMonthYear: string;
  institutions: { id: string; name: string; name_bn?: string }[];
  categories: { id: string; name: string; name_bn?: string; institution_id?: string }[];
  expenses: ExpenseItem[];
  unpaidDues: ExpenseItem[];
  monthlyTotalExpense: number;
  monthlyTotalDeposit: number;
  previousArrears: number;
  previousMonthCash?: number; // Last month cash balance
  previousMonthDue?: number;  // Last month due/arrears
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

// Convert numbers or digits to Bengali if required
const toBnDigit = (num: any): string => {
  const s = String(num ?? '');
  return s.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'['0123456789'.indexOf(d)]);
};

// Format date to Bengali short style if requested (e.g. 2026-10-05 -> ০৫/১০/২৬)
const formatShortDate = (dateStr: string, bn: boolean): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yr = parts[0].slice(-2);
    const mo = parts[1];
    const da = parts[2];
    const formatted = `${da}/${mo}/${yr}`;
    return bn ? toBnDigit(formatted) : formatted;
  }
  return bn ? toBnDigit(dateStr) : dateStr;
};

// Generate an intuitive short name for institution tabs
export const getInstShortName = (name: string): string => {
  if (!name) return 'প্রতিষ্ঠান';
  const trimmed = name.trim();
  if (trimmed.includes('মাদরাসা')) return 'মাদরাসা';
  if (trimmed.includes('এম এইচ') || trimmed.includes('এম.এইচ') || trimmed.includes('এমএইচ')) return 'এম.এইচ সেন্টার';
  // Fallback: take first 2 words or up to 10 characters
  const words = trimmed.split(/\s+/);
  if (words.length > 1 && words[0].length + words[1].length < 12) {
    return `${words[0]} ${words[1]}`;
  }
  return words[0] || trimmed.slice(0, 10);
};

// Sanitize sheet name to conform to Excel limits (max 31 chars, no reserved chars)
const sanitizeSheetName = (name: string, usedNames: Set<string>): string => {
  let clean = (name || 'Sheet')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
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

// Border styles
const borderThin = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const borderMedium = {
  top: { style: 'medium', color: { rgb: '000000' } },
  bottom: { style: 'medium', color: { rgb: '000000' } },
  left: { style: 'medium', color: { rgb: '000000' } },
  right: { style: 'medium', color: { rgb: '000000' } },
};

// Cell styles matching user screenshot template
const STYLES = {
  sheetTitle: {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  sheetSubtitle: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  tableHeader: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin,
    fill: { fgColor: { rgb: 'F1F5F9' } },
  },
  cellText: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin,
  },
  cellCenter: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin,
  },
  cellNumber: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin,
    numFmt: '#,##0',
  },
  cellEmpty: {
    border: borderThin,
  },
  totalLabel: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin,
  },
  totalNumber: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin,
    numFmt: '#,##0',
  },
  sectionBanner: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderThin,
  },
};

/**
 * Creates styled worksheet with exact column widths, merges, row heights, and tab styling
 */
function createStyledSheet(
  rows: any[][],
  colWidths: number[] = [],
  merges: XLSX.Range[] = [],
  tabColor: string = '107C41'
) {
  const ws = XLSX.utils.aoa_to_sheet(
    rows.map(r => r.map(c => (c && typeof c === 'object' && 'v' in c ? c.v : c)))
  );

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

  if (merges.length > 0) {
    ws['!merges'] = merges;
  }

  // Row heights
  ws['!rows'] = [
    { hpt: 26 }, // Row 1: Title
    { hpt: 22 }, // Row 2: Subtitle
    { hpt: 24 }, // Row 3: Header
  ];

  // Excel sheet properties: tab color and gridlines
  (ws as any)['!tabColor'] = { rgb: tabColor };
  (ws as any)['!sheetViews'] = [{ showGridLines: true }];

  return ws;
}

/**
 * Helper to build an Expense / Category Worksheet exactly as shown in Screenshots 1-7
 */
function buildExpenseCategorySheet(
  instName: string,
  subTitle: string,
  items: ExpenseItem[],
  totalLabel: string,
  cleanDesc: (d: string) => string,
  getUnit: (d: string) => string,
  getMethod: (d: string) => string,
  getMemo: (d: string) => string,
  getRemarks: (d: string) => string,
  bn: boolean,
  tabColor: string = '107C41'
) {
  const rows: any[][] = [];

  // Row 1: Institution Name (Merged A1:G1)
  rows.push([
    { v: instName, s: STYLES.sheetTitle },
    '', '', '', '', '', '',
  ]);

  // Row 2: Subtitle (Merged A2:G2)
  rows.push([
    { v: subTitle, s: STYLES.sheetSubtitle },
    '', '', '', '', '', '',
  ]);

  // Row 3: Table Headers (7 Columns matching screenshot)
  rows.push([
    { v: bn ? 'তারিখ' : 'Date', s: STYLES.tableHeader },
    { v: bn ? 'ব্যয়ের বিবরণ' : 'Description', s: STYLES.tableHeader },
    { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.tableHeader },
    { v: bn ? 'ব্যয়ের মাধ্যম' : 'Method', s: STYLES.tableHeader },
    { v: bn ? 'মেমো / রশিদ' : 'Memo / Receipt', s: STYLES.tableHeader },
    { v: bn ? 'ব্যয় টাকা (৳)' : 'Amount (৳)', s: STYLES.tableHeader },
    { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.tableHeader },
  ]);

  let totalAmount = 0;

  // Data Rows
  items.forEach(item => {
    const amt = Number(item.amount || 0);
    totalAmount += amt;

    const rawQty = item.quantity ? String(item.quantity) : '১';
    const unit = getUnit(item.description || '');
    const displayQty = `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি' : 'pcs')}`;

    rows.push([
      { v: formatShortDate(item.expense_date, bn), s: STYLES.cellCenter },
      { v: cleanDesc(item.description || ''), s: STYLES.cellText },
      { v: displayQty, s: STYLES.cellCenter },
      { v: getMethod(item.description || ''), s: STYLES.cellCenter },
      { v: getMemo(item.description || ''), s: STYLES.cellCenter },
      { v: amt, s: STYLES.cellNumber },
      { v: getRemarks(item.description || ''), s: STYLES.cellText },
    ]);
  });

  // Pad empty bordered rows up to row 32 to replicate the exact template seen in screenshot
  const targetRowCount = Math.max(30, items.length + 5);
  while (rows.length < targetRowCount) {
    rows.push([
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
    ]);
  }

  // Summary Row: Col E: মোট ব্যয় / মোট বকেয়া, Col F: totalAmount
  rows.push([
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: totalLabel, s: STYLES.totalLabel },
    { v: totalAmount, s: STYLES.totalNumber },
    { v: '', s: STYLES.cellEmpty },
  ]);

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // A1:G1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // A2:G2
  ];

  // Column widths matching layout
  const colWidths = [12, 32, 14, 15, 15, 16, 20];

  return createStyledSheet(rows, colWidths, merges, tabColor);
}

/**
 * Master Income / Withdrawal / Bank Deposit & Cash Balance Worksheet (Screenshot 9)
 */
function buildIncomeWithdrawalSheet(params: {
  institutionNames: string[];
  reportPeriod: string;
  deposits: any[];
  allInstitutions: { id: string; name: string; name_bn?: string }[];
  allCategories: { id: string; name: string; name_bn?: string; institution_id?: string }[];
  paidExpenses: ExpenseItem[];
  previousMonthCash: number;
  previousMonthDue: number;
  bn: boolean;
  tabColor?: string;
}) {
  const {
    institutionNames,
    reportPeriod,
    deposits,
    allInstitutions,
    allCategories,
    paidExpenses,
    previousMonthCash,
    previousMonthDue,
    bn,
    tabColor = '047857',
  } = params;

  const rows: any[][] = [];
  const merges: XLSX.Range[] = [];

  // Title rows for each institution
  institutionNames.forEach(name => {
    const rIdx = rows.length;
    rows.push([
      { v: name, s: STYLES.sheetTitle },
      '', '', '', '', '',
    ]);
    merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: 5 } });
  });

  // Report Title
  const titleRIdx = rows.length;
  rows.push([
    { v: `${bn ? 'টাকা আয়/ উত্তোলন প্রতিবেদন' : 'Deposit & Income Statement'} - ${reportPeriod}`, s: STYLES.sheetSubtitle },
    '', '', '', '', '',
  ]);
  merges.push({ s: { r: titleRIdx, c: 0 }, e: { r: titleRIdx, c: 5 } });

  // Table Headers (Screenshot 9: তারিখ, ব্যাংক বিবরণ ও অন্যান্য উৎস, উৎস, টাকা, নগদ আছে, বকেয়া)
  rows.push([
    { v: bn ? 'তারিখ' : 'Date', s: STYLES.tableHeader },
    { v: bn ? 'ব্যাংক বিবরণ ও অন্যান্য উৎস' : 'Bank & Source Details', s: STYLES.tableHeader },
    { v: bn ? 'উৎস' : 'Source', s: STYLES.tableHeader },
    { v: bn ? 'টাকা' : 'Amount', s: STYLES.tableHeader },
    { v: bn ? 'নগদ আছে' : 'Cash in Hand', s: STYLES.tableHeader },
    { v: bn ? 'বকেয়া' : 'Due', s: STYLES.tableHeader },
  ]);

  let totalDepositAmount = 0;

  // 1. PREVIOUS MONTH CASH SURPLUS (যদি গত মাসে নগদ থাকে, টাকার কলামে বসবে)
  if (previousMonthCash > 0) {
    totalDepositAmount += previousMonthCash;
    rows.push([
      { v: bn ? '০১ তারিখ' : '01', s: STYLES.cellCenter },
      { v: bn ? 'গত মাসের খরচ শেষে নগদ আছে (জের)' : 'Last Month Ending Cash in Hand', s: STYLES.cellText },
      { v: bn ? 'নগদ তহবিল' : 'Opening Cash', s: STYLES.cellCenter },
      { v: previousMonthCash, s: STYLES.cellNumber },
      { v: previousMonthCash, s: STYLES.cellNumber },
      { v: '', s: STYLES.cellEmpty },
    ]);
  }

  // 2. THIS MONTH DEPOSITS / WITHDRAWALS
  deposits.forEach(d => {
    const amt = Number(d.amount || 0);
    totalDepositAmount += amt;

    const bankDetails = d.bank_details || d.other_details || d.source || (bn ? 'ব্যাংক জমা' : 'Bank Deposit');
    const sourceLabel = d.source || (bn ? 'ব্যাংক' : 'Bank');

    rows.push([
      { v: formatShortDate(d.deposit_date, bn), s: STYLES.cellCenter },
      { v: bankDetails, s: STYLES.cellText },
      { v: sourceLabel, s: STYLES.cellCenter },
      { v: amt, s: STYLES.cellNumber },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
    ]);
  });

  // Pad empty rows to match screenshot aesthetic
  const minDepositRows = Math.max(18, deposits.length + (previousMonthCash > 0 ? 1 : 0) + 4);
  while (rows.length < minDepositRows) {
    rows.push([
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
    ]);
  }

  // Subtotal Row for Deposits
  rows.push([
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: bn ? 'মোট' : 'Total', s: STYLES.totalLabel },
    { v: totalDepositAmount, s: STYLES.totalNumber },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
  ]);

  // 3. PREVIOUS MONTH ARREARS DEDUCTION (যদি বকেয়া দেখায় তাইলে মোট উত্তোলন থেকে বাদ যাবে গত মাসের বকেয়া বাবদ)
  let netAvailableFunds = totalDepositAmount;
  let arrearsDeducted = 0;
  let remainingDue = previousMonthDue;

  if (previousMonthDue > 0) {
    if (totalDepositAmount > 0) {
      arrearsDeducted = Math.min(totalDepositAmount, previousMonthDue);
      remainingDue = previousMonthDue - arrearsDeducted;
      netAvailableFunds = Math.max(0, totalDepositAmount - arrearsDeducted);

      rows.push([
        { v: '', s: STYLES.cellEmpty },
        { v: bn ? '(-) গত মাসের বকেয়া পরিশোধ বাবদ' : '(-) Previous Month Arrears Settle', s: STYLES.cellText },
        { v: bn ? 'বকেয়া কর্তন' : 'Arrears Deduct', s: STYLES.cellCenter },
        { v: -arrearsDeducted, s: STYLES.cellNumber },
        { v: '', s: STYLES.cellEmpty },
        { v: remainingDue > 0 ? remainingDue : 0, s: STYLES.cellNumber },
      ]);
      rows.push([
        { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
        { v: bn ? 'নিট তহবিল' : 'Net Fund', s: STYLES.totalLabel },
        { v: netAvailableFunds, s: STYLES.totalNumber },
        { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
      ]);
    } else {
      netAvailableFunds = 0;
      rows.push([
        { v: '', s: STYLES.cellEmpty },
        { v: bn ? 'পূর্বের অপরিশোধিত বকেয়া' : 'Previous Unpaid Arrears', s: STYLES.cellText },
        { v: bn ? 'বকেয়া স্থিতি' : 'Due Balance', s: STYLES.cellCenter },
        { v: 0, s: STYLES.cellNumber },
        { v: '', s: STYLES.cellEmpty },
        { v: previousMonthDue, s: STYLES.cellNumber },
      ]);
      rows.push([
        { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
        { v: bn ? 'নিট তহবিল' : 'Net Fund', s: STYLES.totalLabel },
        { v: 0, s: STYLES.totalNumber },
        { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
      ]);
    }
  }

  // Empty separator
  rows.push([
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
  ]);

  // 4. CATEGORIES BREAKDOWN SECTION (DYNAMICALLY FOR ALL INSTITUTIONS & CATEGORIES)
  const catHeaderRIdx = rows.length;
  rows.push([
    { v: '', s: STYLES.cellEmpty },
    { v: bn ? 'ক্যাটাগরি' : 'Category', s: STYLES.sectionBanner },
    { v: '', s: STYLES.sectionBanner },
    { v: '', s: STYLES.sectionBanner },
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
  ]);
  merges.push({ s: { r: catHeaderRIdx, c: 1 }, e: { r: catHeaderRIdx, c: 3 } });

  let totalExpensesSum = 0;

  allInstitutions.forEach(inst => {
    const instName = bn ? inst.name_bn || inst.name : inst.name;
    const shortInst = getInstShortName(instName);

    // Categories belonging to this institution, or global active categories
    const instCats = allCategories.filter(c => !c.institution_id || c.institution_id === inst.id);
    const targetCats = instCats.length > 0 ? instCats : allCategories;

    targetCats.forEach(cat => {
      const catExpenses = paidExpenses.filter(e => e.institution_id === inst.id && e.category_id === cat.id);
      const catTotal = catExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      if (catTotal === 0 && targetCats.length > 8) return; // Keep clean if unused and many

      totalExpensesSum += catTotal;
      const catName = bn ? cat.name_bn || cat.name : cat.name;

      rows.push([
        { v: '', s: STYLES.cellEmpty },
        { v: `${shortInst} - ${catName}`, s: STYLES.cellText },
        { v: '', s: STYLES.cellEmpty },
        { v: catTotal, s: STYLES.cellNumber },
        { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
      ]);
    });
  });

  // Final Cash Balance = Net Available Funds - Total Expenses
  const rawCashBalance = netAvailableFunds - totalExpensesSum;
  const finalCashBalance = rawCashBalance > 0 ? rawCashBalance : 0;
  const currentShortfall = rawCashBalance < 0 ? Math.abs(rawCashBalance) : 0;
  const totalArrearsEnd = remainingDue + currentShortfall;

  // Total Expense & Cash Balance Row (Col D: টাকা, Col E: নগদ আছে, Col F: বকেয়া)
  rows.push([
    { v: '', s: STYLES.cellEmpty },
    { v: '', s: STYLES.cellEmpty },
    { v: bn ? 'মোট ব্যয়' : 'Total Expense', s: STYLES.totalLabel },
    { v: totalExpensesSum, s: STYLES.totalNumber },
    { v: finalCashBalance, s: STYLES.totalNumber },
    { v: totalArrearsEnd > 0 ? totalArrearsEnd : '', s: STYLES.totalNumber },
  ]);

  const colWidths = [12, 32, 14, 16, 16, 16];
  return createStyledSheet(rows, colWidths, merges, tabColor);
}

/**
 * Export all expenses into a unified workbook with separate tabs for every institution + category,
 * dues tabs, and the Income/Deposit sheet matching the user's screenshots.
 */
export function exportExpensesMultiTabExcel(params: ExportExcelParams) {
  const {
    selectedMonthYear,
    institutions,
    categories,
    expenses,
    unpaidDues,
    deposits,
    previousArrears,
    previousMonthCash = 0,
    previousMonthDue = previousArrears,
    bn,
    cleanDesc,
    getUnit,
    getMethod,
    getMemo,
    getRemarks,
  } = params;

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Filter regular paid expenses
  const paidExpenses = expenses.filter(e => !e.description?.includes('[due:unpaid]'));

  // Collect institution display names
  const institutionFullNames = institutions.map(i => (bn ? i.name_bn || i.name : i.name));

  // Institution color accents for tabs (matching screenshot pastel/emerald tones)
  const tabColors = ['107C41', '047857', '0D9488', '0891B2', '2563EB'];

  // =========================================================================
  // 1. TABS FOR EACH INSTITUTION & EACH CATEGORY + DUES SHEET
  // =========================================================================
  institutions.forEach((inst, instIdx) => {
    const instFullName = bn ? inst.name_bn || inst.name : inst.name;
    const shortInst = getInstShortName(instFullName);
    const color = tabColors[instIdx % tabColors.length];

    // Find categories for this institution
    const instCats = categories.filter(c => !c.institution_id || c.institution_id === inst.id);
    const targetCats = instCats.length > 0 ? instCats : categories;

    // For each category, create a worksheet
    targetCats.forEach(cat => {
      const catExpenses = paidExpenses.filter(e => e.institution_id === inst.id && e.category_id === cat.id);
      const catName = bn ? cat.name_bn || cat.name : cat.name;

      // Tab name e.g. "মাদরাসা - শিক্ষা বিভাগ", "এম.এইচ সেন্টার - হসপিটাল"
      const tabName = sanitizeSheetName(`${shortInst} - ${catName}`, usedSheetNames);
      const subTitle = `${bn ? 'হিসাব সারসংক্ষেপ' : 'Expense Summary'} - ${params.reportPeriod}`;

      const ws = buildExpenseCategorySheet(
        instFullName,
        subTitle,
        catExpenses,
        bn ? 'মোট ব্যয়' : 'Total Expense',
        cleanDesc,
        getUnit,
        getMethod,
        getMemo,
        getRemarks,
        bn,
        color
      );

      XLSX.utils.book_append_sheet(wb, ws, tabName);
    });

    // Dues sheet for this institution: e.g. "মাদরাসা - বকেয়া হিসাব", "এম.এইচ সেন্টার - বকেয়া"
    const instDues = unpaidDues.filter(e => e.institution_id === inst.id);
    const duesTabName = sanitizeSheetName(`${shortInst} - ${bn ? 'বকেয়া হিসাব' : 'Due Expenses'}`, usedSheetNames);
    const duesSubTitle = `${bn ? 'হিসাব সারসংক্ষেপ বকেয়া' : 'Outstanding Expenses Report'} - ${params.reportPeriod}`;

    const wsDue = buildExpenseCategorySheet(
      instFullName,
      duesSubTitle,
      instDues,
      bn ? 'মোট বকেয়া' : 'Total Due',
      cleanDesc,
      getUnit,
      getMethod,
      getMemo,
      getRemarks,
      bn,
      'B45309' // Warm amber/due color
    );

    XLSX.utils.book_append_sheet(wb, wsDue, duesTabName);
  });

  // =========================================================================
  // 2. MASTER SHEET: টাকা আয়-উত্তোলন (Deposit, Income & Net Cash Balance)
  // =========================================================================
  const incomeSheetName = sanitizeSheetName(bn ? 'টাকা আয়-উত্তোলন' : 'Income & Withdrawals', usedSheetNames);
  const wsIncome = buildIncomeWithdrawalSheet({
    institutionNames: institutionFullNames,
    reportPeriod: params.reportPeriod,
    deposits,
    allInstitutions: institutions,
    allCategories: categories,
    paidExpenses,
    previousMonthCash,
    previousMonthDue,
    bn,
    tabColor: '047857',
  });

  XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

  // Write file
  const fileName = `Expense_${selectedMonthYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export a single institution's expenses with its categories, dues, and income sheet
 */
export function exportSingleInstitutionExcel(params: ExportExcelParams & { selectedInstId: string }) {
  const {
    selectedInstId,
    selectedMonthYear,
    institutions,
    categories,
    expenses,
    unpaidDues,
    deposits,
    previousArrears,
    previousMonthCash = 0,
    previousMonthDue = previousArrears,
    bn,
    cleanDesc,
    getUnit,
    getMethod,
    getMemo,
    getRemarks,
  } = params;

  const inst = institutions.find(i => i.id === selectedInstId);
  if (!inst) return;

  const instFullName = bn ? inst.name_bn || inst.name : inst.name;
  const shortInst = getInstShortName(instFullName);

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  const instExpenses = expenses.filter(e => e.institution_id === selectedInstId && !e.description?.includes('[due:unpaid]'));
  const instDues = unpaidDues.filter(e => e.institution_id === selectedInstId);

  // Find categories for this institution
  const instCats = categories.filter(c => !c.institution_id || c.institution_id === selectedInstId);
  const targetCats = instCats.length > 0 ? instCats : categories;

  // Category sheets
  targetCats.forEach(cat => {
    const catExpenses = instExpenses.filter(e => e.category_id === cat.id);
    const catName = bn ? cat.name_bn || cat.name : cat.name;

    const tabName = sanitizeSheetName(`${shortInst} - ${catName}`, usedSheetNames);
    const subTitle = `${bn ? 'হিসাব সারসংক্ষেপ' : 'Expense Summary'} - ${params.reportPeriod}`;

    const ws = buildExpenseCategorySheet(
      instFullName,
      subTitle,
      catExpenses,
      bn ? 'মোট ব্যয়' : 'Total Expense',
      cleanDesc,
      getUnit,
      getMethod,
      getMemo,
      getRemarks,
      bn,
      '107C41'
    );

    XLSX.utils.book_append_sheet(wb, ws, tabName);
  });

  // Dues sheet
  const duesTabName = sanitizeSheetName(`${shortInst} - ${bn ? 'বকেয়া হিসাব' : 'Due Expenses'}`, usedSheetNames);
  const duesSubTitle = `${bn ? 'হিসাব সারসংক্ষেপ বকেয়া' : 'Outstanding Expenses Report'} - ${params.reportPeriod}`;

  const wsDue = buildExpenseCategorySheet(
    instFullName,
    duesSubTitle,
    instDues,
    bn ? 'মোট বকেয়া' : 'Total Due',
    cleanDesc,
    getUnit,
    getMethod,
    getMemo,
    getRemarks,
    bn,
    'B45309'
  );

  XLSX.utils.book_append_sheet(wb, wsDue, duesTabName);

  // Income / Deposit sheet for this institution
  const incomeSheetName = sanitizeSheetName(bn ? 'টাকা আয়-উত্তোলন' : 'Income & Withdrawals', usedSheetNames);
  const wsIncome = buildIncomeWithdrawalSheet({
    institutionNames: [instFullName],
    reportPeriod: params.reportPeriod,
    deposits,
    allInstitutions: [inst],
    allCategories: targetCats,
    paidExpenses: instExpenses,
    previousMonthCash,
    previousMonthDue,
    bn,
    tabColor: '047857',
  });

  XLSX.utils.book_append_sheet(wb, wsIncome, incomeSheetName);

  // Write file
  const fileName = `${shortInst}_ব্যয়_${selectedMonthYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
