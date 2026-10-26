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
  subCategoriesMap?: Record<string, string[]>;
  getSubCategories?: (catId: string, name?: string, nameBn?: string) => string[];
}

export const DEFAULT_SUB_CATEGORIES_PRESETS: Record<string, string[]> = {
  'boarding': ['চাল, ডাল ও কাঁচাবাজার', 'মাছ ও মাংস', 'তেল, মসলা ও রান্নার উপকরণ', 'গ্যাস ও জ্বালানি'],
  'বডিং': ['চাল, ডাল ও কাঁচাবাজার', 'মাছ ও মাংস', 'তেল, মসলা ও রান্নার উপকরণ', 'গ্যাস ও জ্বালানি'],
  'বোর্ডিং': ['চাল, ডাল ও কাঁচাবাজার', 'মাছ ও মাংস', 'তেল, মসলা ও রান্নার উপকরণ', 'গ্যাস ও জ্বালানি'],
  'খাবার': ['চাল, ডাল ও কাঁচাবাজার', 'মাছ ও মাংস', 'তেল, মসলা ও রান্নার উপকরণ', 'গ্যাস ও জ্বালানি'],
  'খাদ্য': ['চাল, ডাল ও কাঁচাবাজার', 'মাছ ও মাংস', 'তেল, মসলা ও রান্নার উপকরণ', 'গ্যাস ও জ্বালানি'],
  'academic': ['কিতাব ও পাঠ্যবই', 'পরীক্ষার কাগজ ও প্রশ্নপত্র', 'হোয়াইটবোর্ড মার্কার ও চক', 'পুরস্কার ও শিক্ষামূলক উপকরণ'],
  'শিক্ষা': ['কিতাব ও পাঠ্যবই', 'পরীক্ষার কাগজ ও প্রশ্নপত্র', 'হোয়াইটবোর্ড মার্কার ও চক', 'পুরস্কার ও শিক্ষামূলক উপকরণ'],
  'ঘর তৈরি': ['রড ও সিমেন্ট', 'ইট ও বালু', 'রাজমিস্ত্রি ও লেবার খরচ', 'ইলেকট্রিক ও প্লাম্বিং'],
  'নির্মাণ': ['রড ও সিমেন্ট', 'ইট ও বালু', 'রাজমিস্ত্রি ও লেবার খরচ', 'ইলেকট্রিক ও প্লাম্বিং'],
  'মেরামত': ['রড ও সিমেন্ট', 'ইট ও বালু', 'রাজমিস্ত্রি ও লেবার খরচ', 'ইলেকট্রিক ও প্লাম্বিং'],
  'হসপিটাল': ['ওষুধ ও স্যালাইন', 'চিকিৎসা সরঞ্জাম', 'ডাক্তার ফি ও ল্যাব টেস্ট'],
  'চিকিৎসা': ['ওষুধ ও স্যালাইন', 'চিকিৎসা সরঞ্জাম', 'ডাক্তার ফি ও ল্যাব টেস্ট'],
  'দাপ্তরিক': ['স্টেশনারি ও খাতা-কলম', 'প্রিন্টিং ও ফটোকপি', 'ইন্টারনেট ও বিল', 'আপ্যায়ন ও মেহমানদারি'],
  'অফিস': ['স্টেশনারি ও খাতা-কলম', 'প্রিন্টিং ও ফটোকপি', 'ইন্টারনেট ও বিল', 'আপ্যায়ন ও মেহমানদারি'],
  'মাদরাসা': ['মেরামত ও রক্ষণাবেক্ষণ', 'বিদ্যুৎ ও পানির বিল', 'আপ্যায়ন ও মেহমানদারি'],
};

// Convert numbers or digits to Bengali if required
const toBnDigit = (num: any): string => {
  const s = String(num ?? '');
  return s.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'['0123456789'.indexOf(d)]);
};

// Format date to Bengali short style if requested (e.g. 2026-10-05 -> ০৫/১০/২০২৬)
const formatShortDate = (dateStr: string, bn: boolean): string => {
  if (!dateStr) return '-';
  const parts = String(dateStr).trim().split('-');
  if (parts.length === 3) {
    const yr = parts[0];
    const mo = parts[1];
    const da = parts[2];
    const formatted = `${da}/${mo}/${yr}`;
    return bn ? toBnDigit(formatted) : formatted;
  }
  return bn ? toBnDigit(dateStr) : String(dateStr);
};

const getMethodLabel = (m: string, bn: boolean): string => {
  if (!m) return bn ? 'ক্যাশ' : 'Cash';
  const lower = m.toLowerCase().trim();
  if (lower === 'cash' || lower === 'ক্যাশ') return bn ? 'ক্যাশ' : 'Cash';
  if (lower === 'bank' || lower === 'ব্যাংক') return bn ? 'ব্যাংক' : 'Bank';
  if (lower === 'cheque' || lower === 'check' || lower === 'চেক') return bn ? 'চেক' : 'Cheque';
  if (lower === 'bkash' || lower === 'বিকাশ') return bn ? 'বিকাশ' : 'bKash';
  if (lower === 'nagad' || lower === 'নগদ') return bn ? 'নগদ' : 'Nagad';
  if (lower === 'rocket' || lower === 'রকেট') return bn ? 'রকেট' : 'Rocket';
  if (lower === 'online' || lower === 'অনলাইন') return bn ? 'অনলাইন' : 'Online';
  return m;
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
  grandTotalLabel: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderMedium,
  },
  grandTotalNumber: {
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '047857' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderMedium,
    numFmt: '#,##0',
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

export const getSubCategory = (desc?: string | null): string => {
  if (!desc) return '';
  const match = desc.match(/\[sub:(.*?)\]/);
  return match ? match[1].trim() : '';
};

/**
 * Helper to build an Expense / Category Worksheet supporting multi-section sub-categories
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
  tabColor: string = '107C41',
  catBaseName?: string,
  reportPeriod?: string,
  configuredSubCategories?: string[]
) {
  const baseName = catBaseName || '';
  const periodStr = reportPeriod ? ` - ${reportPeriod}` : '';

  // 1. Collect candidate sub-categories:
  const candidateSubs: string[] = [];

  // a) From configured sub-categories passed in
  if (configuredSubCategories && Array.isArray(configuredSubCategories)) {
    configuredSubCategories.forEach(s => {
      const trimmed = s?.trim();
      if (trimmed && !candidateSubs.includes(trimmed)) candidateSubs.push(trimmed);
    });
  }

  // b) Fallback to presets based on baseName
  if (candidateSubs.length === 0 && baseName) {
    const combinedCat = baseName.toLowerCase();
    for (const [key, preset] of Object.entries(DEFAULT_SUB_CATEGORIES_PRESETS)) {
      if (combinedCat.includes(key.toLowerCase())) {
        preset.forEach(s => {
          if (!candidateSubs.includes(s)) candidateSubs.push(s);
        });
        break;
      }
    }
  }

  // c) Add any explicit sub-categories from items
  items.forEach(item => {
    const s = getSubCategory(item.description);
    if (s && !candidateSubs.includes(s)) candidateSubs.push(s);
  });

  // Helper: Match item to a sub-category (explicit tag OR smart keyword matching)
  const getItemSubCat = (item: ExpenseItem): string => {
    const explicit = getSubCategory(item.description);
    if (explicit) return explicit;
    if (candidateSubs.length === 0) return '';

    const desc = (item.description || '').toLowerCase();
    for (const sub of candidateSubs) {
      const words = sub.split(/[,&/।\s]+/).filter(w => w.length > 1 && !['ও', 'এবং', 'and', 'খরচ', 'সামগ্রী', 'উপকরণ', 'অন্যান্য'].includes(w));
      if (words.some(w => desc.includes(w.toLowerCase()))) {
        return sub;
      }
    }
    return '';
  };

  // If there are NO sub-categories at all, render single clean table
  if (candidateSubs.length === 0) {
    const rows: any[][] = [];
    rows.push([ { v: instName, s: STYLES.sheetTitle }, '', '', '', '', '', '' ]);
    const effectiveSubTitle = baseName
      ? `${bn ? 'হিসাব সংক্ষেপ' : 'Expense Summary'} - ${baseName}${periodStr}`
      : subTitle;
    rows.push([ { v: effectiveSubTitle, s: STYLES.sheetSubtitle }, '', '', '', '', '', '' ]);
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
    items.forEach(item => {
      const amt = Number(item.amount || 0);
      totalAmount += amt;

      const hasItemQty = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
      const rawQty = hasItemQty ? (bn ? toBnDigit(item.quantity) : String(item.quantity)) : '';
      const unit = getUnit(item.description || '');
      const displayQty = hasItemQty ? (unit ? `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি' : 'pcs')}` : `${rawQty}`) : (unit ? `${unit}` : '-');
      const memoVal = getMemo(item.description || '');
      const displayMemo = memoVal === '-' ? '-' : (bn ? toBnDigit(memoVal) : memoVal);
      const methodVal = getMethodLabel(getMethod(item.description || ''), bn);

      rows.push([
        { v: formatShortDate(item.expense_date, bn), s: STYLES.cellCenter },
        { v: cleanDesc(item.description || ''), s: STYLES.cellText },
        { v: displayQty, s: STYLES.cellCenter },
        { v: methodVal, s: STYLES.cellCenter },
        { v: displayMemo, s: STYLES.cellCenter },
        { v: amt, s: bn ? { ...STYLES.cellNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.cellNumber },
        { v: getRemarks(item.description || ''), s: STYLES.cellText },
      ]);
    });

    const targetRowCount = Math.max(30, items.length + 5);
    while (rows.length < targetRowCount) {
      rows.push([
        { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
      ]);
    }

    rows.push([
      { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty }, { v: `${bn ? 'মোট' : 'Total'} ${baseName || (bn ? 'ব্যয়' : 'Expense')}`, s: STYLES.totalLabel },
      { v: totalAmount, s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
      { v: '', s: STYLES.cellEmpty },
    ]);

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];
    const colWidths = [12, 32, 14, 15, 15, 16, 20];
    return createStyledSheet(rows, colWidths, merges, tabColor);
  }

  // MULTI-SECTION TABLE (SECTION-WISE BY SUB-CATEGORY)
  const rows: any[][] = [];
  const merges: XLSX.Range[] = [];
  const colWidths = [12, 32, 14, 15, 15, 16, 20];
  let grandTotal = 0;

  // Build list of sections
  const mainItems = items.filter(i => !getItemSubCat(i));
  interface TableSection {
    subtitleText: string;
    sectionItems: ExpenseItem[];
    subtotalText: string;
  }
  const sectionsList: TableSection[] = [];

  // 1. Direct / unassigned expenses in main category (NO "মেইন" word!)
  if (mainItems.length > 0) {
    sectionsList.push({
      subtitleText: `${bn ? 'হিসাব সংক্ষেপ' : 'Expense Summary'} - ${baseName}${periodStr}`,
      sectionItems: mainItems,
      subtotalText: bn ? 'মোট ব্যয়' : 'Total Expense',
    });
  }

  // 2. Each Sub-category section
  candidateSubs.forEach(subName => {
    const subItems = items.filter(i => getItemSubCat(i) === subName);
    sectionsList.push({
      subtitleText: `${bn ? 'হিসাব সংক্ষেপ' : 'Expense Summary'} - ${baseName} - ${subName}${periodStr}`,
      sectionItems: subItems,
      subtotalText: `${bn ? 'মোট' : 'Total'} ${subName}`,
    });
  });

  // Render each section
  sectionsList.forEach(sec => {
    const secStartRow = rows.length;

    // Row 1: Title (Merged A:G)
    rows.push([
      { v: instName, s: STYLES.sheetTitle },
      '', '', '', '', '', '',
    ]);
    merges.push({ s: { r: secStartRow, c: 0 }, e: { r: secStartRow, c: 6 } });

    // Row 2: Subtitle (Merged A:G)
    rows.push([
      { v: sec.subtitleText, s: STYLES.sheetSubtitle },
      '', '', '', '', '', '',
    ]);
    merges.push({ s: { r: secStartRow + 1, c: 0 }, e: { r: secStartRow + 1, c: 6 } });

    // Row 3: Headers
    rows.push([
      { v: bn ? 'তারিখ' : 'Date', s: STYLES.tableHeader },
      { v: bn ? 'ব্যয়ের বিবরণ' : 'Description', s: STYLES.tableHeader },
      { v: bn ? 'পরিমাণ' : 'Quantity', s: STYLES.tableHeader },
      { v: bn ? 'ব্যয়ের মাধ্যম' : 'Method', s: STYLES.tableHeader },
      { v: bn ? 'মেমো / রশিদ' : 'Memo / Receipt', s: STYLES.tableHeader },
      { v: bn ? 'ব্যয় টাকা (৳)' : 'Amount (৳)', s: STYLES.tableHeader },
      { v: bn ? 'মন্তব্য' : 'Remarks', s: STYLES.tableHeader },
    ]);

    let secTotal = 0;
    sec.sectionItems.forEach(item => {
      const amt = Number(item.amount || 0);
      secTotal += amt;
      grandTotal += amt;

      const hasItemQty = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
      const rawQty = hasItemQty ? (bn ? toBnDigit(item.quantity) : String(item.quantity)) : '';
      const unit = getUnit(item.description || '');
      const displayQty = hasItemQty ? (unit ? `${rawQty} ${unit !== 'পিস' ? unit : (bn ? 'টি' : 'pcs')}` : `${rawQty}`) : (unit ? `${unit}` : '-');
      const memoVal = getMemo(item.description || '');
      const displayMemo = memoVal === '-' ? '-' : (bn ? toBnDigit(memoVal) : memoVal);
      const methodVal = getMethodLabel(getMethod(item.description || ''), bn);

      rows.push([
        { v: formatShortDate(item.expense_date, bn), s: STYLES.cellCenter },
        { v: cleanDesc(item.description || ''), s: STYLES.cellText },
        { v: displayQty, s: STYLES.cellCenter },
        { v: methodVal, s: STYLES.cellCenter },
        { v: displayMemo, s: STYLES.cellCenter },
        { v: amt, s: bn ? { ...STYLES.cellNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.cellNumber },
        { v: getRemarks(item.description || ''), s: STYLES.cellText },
      ]);
    });

    // Pad empty rows for ledger look
    const minRows = Math.max(6, sec.sectionItems.length + 2);
    for (let p = sec.sectionItems.length; p < minRows; p++) {
      rows.push([
        { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty }, { v: '', s: STYLES.cellEmpty },
        { v: '', s: STYLES.cellEmpty },
      ]);
    }

    // Section Subtotal Row
    rows.push([
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: '', s: STYLES.cellEmpty },
      { v: sec.subtotalText, s: STYLES.totalLabel },
      { v: secTotal, s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
      { v: '', s: STYLES.cellEmpty },
    ]);

    // 2 blank separator rows
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
  });

  // GRAND TOTAL SUMMARY AT THE END
  const grandRowIdx = rows.length;
  const grandTotalText = bn ? `${baseName} খাতের সর্বমোট ব্যয়` : `Grand Total for ${baseName}`;
  rows.push([
    { v: grandTotalText, s: STYLES.grandTotalLabel },
    '', '', '', '',
    { v: grandTotal, s: bn ? { ...STYLES.grandTotalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.grandTotalNumber },
    { v: '', s: STYLES.grandTotalLabel },
  ]);
  merges.push({ s: { r: grandRowIdx, c: 0 }, e: { r: grandRowIdx, c: 4 } });

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
      { v: previousMonthCash, s: bn ? { ...STYLES.cellNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.cellNumber },
      { v: previousMonthCash, s: bn ? { ...STYLES.cellNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.cellNumber },
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
      { v: amt, s: bn ? { ...STYLES.cellNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.cellNumber },
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
    { v: totalDepositAmount, s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
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
    { v: totalExpensesSum, s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
    { v: finalCashBalance, s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
    { v: totalArrearsEnd > 0 ? totalArrearsEnd : '', s: bn ? { ...STYLES.totalNumber, numFmt: '[$-bn-BD,100]#,##0' } : STYLES.totalNumber },
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
      const subTitle = `${bn ? 'হিসাব সংক্ষেপ' : 'Expense Summary'} - ${catName} - ${params.reportPeriod}`;

      const catSubs = params.getSubCategories
        ? params.getSubCategories(cat.id, cat.name, cat.name_bn)
        : (params.subCategoriesMap?.[cat.id] || []);

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
        color,
        catName,
        params.reportPeriod,
        catSubs
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
    const subTitle = `${bn ? 'হিসাব সংক্ষেপ' : 'Expense Summary'} - ${catName} - ${params.reportPeriod}`;

    const catSubs = params.getSubCategories
      ? params.getSubCategories(cat.id, cat.name, cat.name_bn)
      : (params.subCategoriesMap?.[cat.id] || []);

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
      '107C41',
      catName,
      params.reportPeriod,
      catSubs
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
