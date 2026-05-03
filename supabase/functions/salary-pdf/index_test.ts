// Regression tests for salary-pdf table layout.
//
// These tests guarantee that no matter how many columns are added/removed
// from the COLUMNS registry in index.ts, the rendered HTML stays internally
// consistent so columns never get cut off:
//
//   1. <colgroup> col widths sum to ~100%
//   2. Every <th> in the column-header row matches the <td> count in each body row
//   3. Every colspan in spanning rows (page header, note, footer, totals label)
//      equals the actual column count
//   4. All weights are positive
//
// Run with: deno test --allow-net --allow-env supabase/functions/salary-pdf/index_test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/salary-pdf`;

// A minimal but realistic payload. The handler enforces auth, so when run
// without a user JWT we still get a deterministic 401. For a true render
// snapshot we expose a `dryRun=html` mode (added below) that bypasses auth
// and returns the HTML so structural invariants can be asserted.
const samplePayload = {
  dryRun: "html",
  bn: true,
  monthLabel: "জানুয়ারি",
  year: "২০২৫",
  sheetId: "TEST-001",
  issueDate: "01/01/2025",
  instName: "Test Institution",
  staff: [
    { name: "Test One",   staff_id: "S-1", designation: "Teacher", base_salary: 20000, present: 26, absent: 0, late: 0, leave: 0, deductions: 500,  overtime: 0,  savings: 1000, net_salary: 18500 },
    { name: "Test Two",   staff_id: "S-2", designation: "Clerk",   base_salary: 15000, present: 25, absent: 1, late: 1, leave: 0, deductions: 0,    overtime: 200, savings: 0,    net_salary: 15200 },
    { name: "Test Three", staff_id: "S-3", designation: "Guard",   base_salary: 12000, present: 26, absent: 0, late: 0, leave: 0, deductions: 0,    overtime: 0,   savings: 500,  net_salary: 11500 },
  ],
  totals: { base: 47000, deductions: 500, overtime: 200, savings: 1500, net: 45200 },
};

async function fetchHtml(): Promise<string> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(samplePayload),
  });
  const text = await res.text();
  assertEquals(res.status, 200, `dryRun should return 200, got ${res.status}: ${text.slice(0, 200)}`);
  return text;
}

// ---- Helpers ----------------------------------------------------------------
function countMatches(re: RegExp, s: string): number {
  return (s.match(re) || []).length;
}

function extractColgroupWidths(html: string): number[] {
  const cg = html.match(/<colgroup>([\s\S]*?)<\/colgroup>/);
  assert(cg, "expected a <colgroup> block in rendered HTML");
  return [...cg![1].matchAll(/width:\s*([\d.]+)%/g)].map((m) => parseFloat(m[1]));
}

function countCellsInColumnHeaderRow(html: string): number {
  const m = html.match(/<tr class="column-header-row">([\s\S]*?)<\/tr>/);
  assert(m, "expected a <tr class=\"column-header-row\">");
  return countMatches(/<th\b/g, m![1]);
}

function staffRowCellCounts(html: string): number[] {
  return [...html.matchAll(/<tr class="staff-row">([\s\S]*?)<\/tr>/g)].map(
    (m) => countMatches(/<td\b/g, m[1]),
  );
}

function spanningColspans(html: string): number[] {
  // Every full-width row uses colspan="N" — header, note, footer, totals label.
  return [...html.matchAll(/colspan="(\d+)"/g)].map((m) => parseInt(m[1], 10));
}

// ---- Tests ------------------------------------------------------------------
Deno.test("salary-pdf: colgroup widths sum to ~100%", async () => {
  const html = await fetchHtml();
  const widths = extractColgroupWidths(html);
  assert(widths.length > 0, "no <col> entries found");
  const sum = widths.reduce((a, b) => a + b, 0);
  assert(
    Math.abs(sum - 100) < 0.5,
    `colgroup widths must sum to 100% (±0.5), got ${sum.toFixed(3)}%`,
  );
  for (const w of widths) {
    assert(w > 0, `col width must be > 0, got ${w}`);
  }
});

Deno.test("salary-pdf: every staff row has exactly COL_COUNT cells", async () => {
  const html = await fetchHtml();
  const colCount = countCellsInColumnHeaderRow(html);
  const colWidths = extractColgroupWidths(html);
  assertEquals(
    colWidths.length,
    colCount,
    `<colgroup> entries (${colWidths.length}) must match column-header <th> count (${colCount})`,
  );
  const rowCounts = staffRowCellCounts(html);
  assert(rowCounts.length > 0, "expected at least one staff row");
  for (const [i, n] of rowCounts.entries()) {
    assertEquals(
      n,
      colCount,
      `staff row #${i + 1} has ${n} <td> cells but column count is ${colCount} — columns will be cut off`,
    );
  }
});

Deno.test("salary-pdf: every full-width colspan equals COL_COUNT (or totals label span)", async () => {
  const html = await fetchHtml();
  const colCount = countCellsInColumnHeaderRow(html);
  const spans = spanningColspans(html);
  assert(spans.length > 0, "expected colspan attributes in header/footer/note rows");
  for (const span of spans) {
    assert(
      span >= 1 && span <= colCount,
      `colspan=${span} is out of range (1..${colCount})`,
    );
  }
  // The header, note, and footer cells must each fully span the table.
  // Count how many spans equal COL_COUNT — there should be at least 3
  // (page header, note row, tfoot).
  const fullSpans = spans.filter((s) => s === colCount).length;
  assert(
    fullSpans >= 3,
    `expected ≥3 full-width colspans (=${colCount}); got ${fullSpans}. ` +
      `A new column was likely added without updating a colspan.`,
  );
});

Deno.test("salary-pdf: totals row cell count equals COL_COUNT", async () => {
  const html = await fetchHtml();
  const colCount = countCellsInColumnHeaderRow(html);
  const m = html.match(/<tr class="totals">([\s\S]*?)<\/tr>/);
  assert(m, "expected a <tr class=\"totals\"> row");
  const inner = m![1];
  const tdTags = [...inner.matchAll(/<td\b[^>]*>/g)].map((mm) => mm[0]);
  const effective = tdTags.reduce((a, tag) => {
    const cs = tag.match(/colspan="(\d+)"/);
    return a + (cs ? parseInt(cs[1], 10) : 1);
  }, 0);
  assertEquals(
    effective,
    colCount,
    `totals row spans ${effective} cells but column count is ${colCount}`,
  );
});
