import { safeRows, csvCell, safeCell } from '@/lib/spreadsheetSafe';
import XLSX from 'xlsx-js-style';

interface AttendanceExcelParams {
  title: string;
  institutionName: string;
  reportDate: string;
  selectedDate: string;
  columns: { key: string; label: string; center?: boolean }[];
  rows: Record<string, any>[];
  stats: { total: number; present: number; absent: number; totalLateMinutes?: number };
  bn: boolean;
}

const hexToArgb = (hex: string) => 'FF' + hex.replace('#', '');

export const exportAttendanceExcel = ({
  title, institutionName, reportDate, selectedDate,
  columns, rows, stats, bn,
}: AttendanceExcelParams) => {
  const wb = XLSX.utils.book_new();

  const totalCols = columns.length;
  const sheetData: any[][] = [];

  // Row 1: Institution name (merged)
  sheetData.push([institutionName]);
  // Row 2: Report date
  sheetData.push([`${bn ? 'রিপোর্ট তৈরির তারিখ' : 'Report Date'}: ${reportDate} | ${bn ? 'হাজিরার তারিখ' : 'Attendance Date'}: ${selectedDate}`]);
  // Row 3: Title
  sheetData.push([title]);
  // Row 4: Empty spacer
  sheetData.push([]);
  // Row 5: Column headers
  sheetData.push(columns.map(c => c.label));

  // Data rows
  rows.forEach(row => {
    sheetData.push(columns.map(c => row[c.key] ?? '-'));
  });

  // Empty row before summary
  sheetData.push([]);

  // Summary row
  const summaryStartRow = sheetData.length;
  sheetData.push([
    bn ? 'মোট' : 'Total', String(stats.total), '',
    bn ? 'উপস্থিত' : 'Present', String(stats.present), '',
    bn ? 'অনুপস্থিত' : 'Absent', String(stats.absent),
    ...(stats.totalLateMinutes !== undefined ? ['', bn ? 'মোট বিলম্ব' : 'Total Late', `${stats.totalLateMinutes} ${bn ? 'মিনিট' : 'Min'}`] : []),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(safeRows(sheetData));

  // Merge cells for header rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
  ];

  // Set column widths — generous for Bengali
  const colWidths = columns.map(c => {
    if (c.key === 'name') return { wch: 28 };
    if (c.key === 'designation') return { wch: 22 };
    if (c.key === 'status') return { wch: 16 };
    if (c.key === 'late') return { wch: 16 };
    return { wch: 16 };
  });
  ws['!cols'] = colWidths;

  // Set row heights
  const rowHeights: Record<number, { hpt: number }> = {};
  rowHeights[0] = { hpt: 32 }; // Institution name
  rowHeights[1] = { hpt: 22 };
  rowHeights[2] = { hpt: 26 }; // Title
  for (let i = 4; i < sheetData.length; i++) {
    rowHeights[i] = { hpt: 25 };
  }
  ws['!rows'] = Array.from({ length: sheetData.length }, (_, i) => rowHeights[i] || { hpt: 25 });

  // ─── Styles ───
  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
  };
  const thickBorder = {
    top: { style: 'medium', color: { rgb: 'FF94A3B8' } },
    bottom: { style: 'medium', color: { rgb: 'FF94A3B8' } },
    left: { style: 'medium', color: { rgb: 'FF94A3B8' } },
    right: { style: 'medium', color: { rgb: 'FF94A3B8' } },
  };

  const headerRowIdx = 4;

  // Apply styles to all cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (!cell.s) cell.s = {};

      // Default font
      cell.s.font = { name: 'SutonnyOMJ', sz: 11, color: { rgb: 'FF1E293B' } };
      cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
      cell.s.border = thinBorder;

      // Row 1 — Institution Name
      if (r === 0) {
        cell.s.font = { name: 'SutonnyOMJ', sz: 16, bold: true, color: { rgb: 'FF064E3B' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        cell.s.border = {};
      }
      // Row 2 — Report Date
      if (r === 1) {
        cell.s.font = { name: 'SutonnyOMJ', sz: 10, color: { rgb: 'FF64748B' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        cell.s.border = {};
      }
      // Row 3 — Title
      if (r === 2) {
        cell.s.font = { name: 'SutonnyOMJ', sz: 13, bold: true, color: { rgb: 'FF0F172A' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        cell.s.border = {};
      }
      // Row 4 — Empty spacer
      if (r === 3) {
        cell.s.border = {};
      }

      // Header row (column labels)
      if (r === headerRowIdx) {
        cell.s.fill = { fgColor: { rgb: hexToArgb('#059669') } };
        cell.s.font = { name: 'SutonnyOMJ', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // Data rows — left-align name and designation
      if (r > headerRowIdx && r < summaryStartRow) {
        const col = columns[c];
        if (col && !col.center) {
          cell.s.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        }

        // Zebra striping
        const dataRowIdx = r - headerRowIdx - 1;
        if (dataRowIdx % 2 === 1) {
          cell.s.fill = { fgColor: { rgb: hexToArgb('#F8FAFC') } };
        }

        // Conditional formatting for status column
        if (col?.key === 'status') {
          const val = String(cell.v || '');
          if (val === 'উপস্থিত' || val === 'Present') {
            cell.s.font = { ...cell.s.font, color: { rgb: 'FF16A34A' }, bold: true };
          } else if (val === 'অনুপস্থিত' || val === 'Absent') {
            cell.s.font = { ...cell.s.font, color: { rgb: 'FFDC2626' }, bold: true };
          } else if (val === 'বিলম্ব' || val === 'Late') {
            cell.s.font = { ...cell.s.font, color: { rgb: 'FFEA580C' }, bold: true };
          }
        }

        // Late column — orange if > 0
        if (col?.key === 'late') {
          const val = String(cell.v || '');
          if (val !== '-' && val !== '' && val !== '0') {
            cell.s.font = { ...cell.s.font, color: { rgb: 'FFEA580C' }, bold: true };
          }
        }
      }

      // Summary row
      if (r >= summaryStartRow) {
        cell.s.fill = { fgColor: { rgb: hexToArgb('#F1F5F9') } };
        cell.s.font = { name: 'SutonnyOMJ', sz: 11, bold: true, color: { rgb: 'FF0F172A' } };
        cell.s.border = thickBorder;
      }
    }
  }

  const sheetName = bn ? `${title.slice(0, 25)}` : title.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.replace(/[\\\/\?\*\[\]]/g, ''));

  // Write with styles
  XLSX.writeFile(wb, `${title}_${selectedDate}.xlsx`, { bookType: 'xlsx', cellStyles: true });
};

// Calculate late minutes (overnight-aware when shiftEnd is supplied).
// For overnight shifts (e.g. 17:00 → 05:00), a check-in earlier than shiftStart
// is treated as next-day and gets +24h. A check-in within the shift window
// returns the diff from shiftStart; outside the window returns 0.
export const calcLateMinutes = (
  checkInTime: string | null,
  shiftStart: string,
  shiftEnd?: string,
): number => {
  if (!checkInTime || !shiftStart) return 0;
  const [sh, sm] = shiftStart.split(':').map(Number);
  const [ch, cm] = checkInTime.split(':').map(Number);
  let shiftMinutes = sh * 60 + sm;
  let checkMinutes = ch * 60 + cm;

  if (shiftEnd) {
    const [eh, em] = shiftEnd.split(':').map(Number);
    let shiftEndMin = eh * 60 + em;
    const overnight = shiftEndMin <= shiftMinutes;
    if (overnight) {
      shiftEndMin += 24 * 60;
      // Check-in earlier than start clock time → next day arrival
      if (checkMinutes < shiftMinutes) checkMinutes += 24 * 60;
      // Beyond shift end window → not "late", treat as 0
      if (checkMinutes > shiftEndMin) return 0;
    }
  }

  const diff = checkMinutes - shiftMinutes;
  return diff > 0 ? diff : 0;
};
