## লক্ষ্য
`/admin/expenses` (হিসাব ব্যবস্থাপনা) পেজে একটি নতুন **"লেজার / লেনদেন তালিকা"** ট্যাব যোগ করা যেখানে সব ধরনের লেনদেন এক জায়গায় দেখা যাবে — আয় (Credit) ও ব্যয় (Debit) সহ running balance।

## Data Sources (5 টি টেবিল একত্রে merge)
| উৎস | Table | টাইপ | পরিমাণ |
|---|---|---|---|
| হিসাব / খরচ | `expenses` | ব্যয় (Debit) | `amount` |
| টাকা আয়/উত্তোলন | `deposits` | আয় (Credit) | `amount` |
| ফি পেমেন্ট | `fee_payments` | আয় (Credit) | `paid_amount` |
| বেতন পরিশোধ | `salary_records` (paid=true) | ব্যয় (Debit) | `net_amount` |
| অন্যান্য | `verified_payments` (donations) | আয় (Credit) | `amount` |

সবগুলোকে normalize করে একটি unified row shape-এ আনব:
```text
{ id, date, type: 'credit'|'debit', source, institution, category, description, amount, ref }
```

## UI (নতুন ট্যাব: "লেজার")

**অবস্থান:** `AdminExpenses.tsx`-এ `হিসাব / সারাংশ` বাটনের পাশে নতুন **"লেজার"** বাটন।

**ফিল্টার বার (sticky, top):**
- তারিখ রেঞ্জ (from → to; default: চলতি মাস)
- টাইপ: সব / শুধু আয় / শুধু ব্যয়
- উৎস multi-select: হিসাব, জমা, ফি, বেতন, অন্যান্য
- প্রতিষ্ঠান dropdown + ক্যাটেগরি dropdown (dependent)
- সার্চ বক্স (বিবরণ/ref-এ live filter)

**View toggle (দুইটা মোড):**
1. **সরল তালিকা** — `#, তারিখ, টাইপ (badge), উৎস, প্রতিষ্ঠান, ক্যাটেগরি, বিবরণ, টাকা`
2. **ক্লাসিক লেজার** — `#, তারিখ, বিবরণ, ডেবিট (৳), ক্রেডিট (৳), ব্যালেন্স (৳)` তারিখ অনুসারে sort + running balance

**Footer summary row:** মোট আয়, মোট ব্যয়, নিট ব্যালেন্স (color-coded — সবুজ/লাল)।

**Styling:** বিদ্যমান Excel-style টেবিল (slate gridlines, `bg-slate-100` header, zebra rows, right-aligned amounts, tabular-nums, `bg-slate-800` total footer) মিলিয়ে।

## এক্সপোর্ট
- **Excel** (xlsx-js-style) — বর্তমান `expense-monthly-summary` স্টাইল মেনে (corporate header + prof stripes)
- **PDF প্রিন্ট** — বিদ্যমান `pwaPrintAdapter` দিয়ে A4 landscape; প্রতিষ্ঠানের নাম/লোগো + period + সব রো + footer summary

## Technical Notes
- নতুন ফাইল: `src/components/expenses/LedgerReport.tsx` — self-contained, receives `expenses/deposits/feePayments/salaries/verifiedPayments` props।
- `AdminExpenses.tsx`-এ existing hooks (`useExpenses`, `useDeposits`) reuse; নতুন query hooks: `useFeePaymentsByRange`, `useSalaryPaidByRange`, `useVerifiedPaymentsByRange` (client-side filter দিয়ে period-based)।
- কোনো DB migration/schema change লাগবে না — শুধু read।
- Permission: existing `expenses` module permission (view) দিয়েই gated।
- Bengali digits + `formatNum` helper reuse; date `dd/MM/yyyy` project standard।

## Deliverables
1. `src/components/expenses/LedgerReport.tsx` (নতুন)
2. `AdminExpenses.tsx`-এ নতুন "লেজার" ট্যাব বাটন + সেকশন
3. Excel export helper (existing pattern অনুসরণ)
4. Print preview handler
