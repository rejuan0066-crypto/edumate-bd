# আবাসিক ডিউটি — অনুপস্থিতি ও বিলম্ব কর্তন

প্রতিটি ডিউটি শিফটে অনুপস্থিত থাকলে নির্দিষ্ট টাকা কর্তন হবে, এবং টগল অন থাকলে বিলম্বের ক্ষেত্রেও একই হারে কর্তন হবে। কর্তন নিট বেতন থেকে বাদ যাবে এবং বেতন স্লিপে আলাদা লাইনে দেখাবে। ছুটির দিনে কোনো কর্তন হবে না।

## ডেটাবেজ

`duty_shifts` টেবিলে নতুন ফিল্ড:
- `absent_deduction_amount` (numeric, ডিফল্ট 0) — এই শিফটে অনুপস্থিত থাকলে কত টাকা কাটা যাবে
- `late_deduction_enabled` (boolean, ডিফল্ট false) — বিলম্ব কর্তন চালু/বন্ধ টগল
- `late_deduction_amount` (numeric, nullable) — খালি থাকলে অনুপস্থিতির টাকার সমান ধরা হবে
- `late_deduction_mode` (text, `flat` | `per_minute`, ডিফল্ট `flat`) — পুরো টাকা নাকি প্রতি মিনিট হারে

কোনো ফিল্ড সেট না থাকলে কর্তন ০ — অর্থাৎ বর্তমান আচরণ অপরিবর্তিত থাকবে।

## সেটিং UI (আবাসিক ডিউটি → শিফট সেটিং)

শিফট ফর্মে নতুন "কর্তন সেটিং" সেকশন: অনুপস্থিতি কর্তন (৳/শিফট), বিলম্ব কর্তন টগল, বিলম্ব কর্তনের ধরন (পুরো / প্রতি মিনিট), বিলম্ব কর্তন টাকা। শিফট তালিকায় একটি "কর্তন" কলাম যোগ হবে।

## হিসাবের নিয়ম (accuracy-first)

মাসের প্রতিটি রোস্টার-নির্ধারিত ডিউটি দিন × শিফট ধরে হিসাব:

```text
ছুটির দিন (staff_holidays / holidays / paid weekly off)  → কর্তন ০, সম্পূর্ণ বাদ
status = absent                                          → absent_deduction_amount
status = late এবং late_deduction_enabled                 → flat: late_deduction_amount
                                                           per_minute: rate × (late_minutes + early_exit_minutes)
status = present                                         → ০
হাজিরা রেকর্ড নাই এবং দিনটি ভবিষ্যৎ/ছুটি নয়              → absent হিসেবে গণ্য
```

- বিলম্ব কর্তন কখনো `absent_deduction_amount`-এর বেশি হবে না (per_minute মোডে ক্যাপ)।
- grace_minutes / early_exit_grace_minutes আগে বাদ দিয়ে তারপর মিনিট গোনা হবে, যাতে ডাবল কাউন্ট না হয়।
- একই দিনে একই শিফট দুইবার গোনা হবে না (shift_id + date ইউনিক করে dedupe)।
- ফলাফল টাকায় রাউন্ড (২ দশমিক) হবে; মোট = সব লাইনের যোগফল।

## বেতনে সংযুক্তি

- `AdminSalary` মাসের `duty_shift_attendance` + রোস্টার লোড করে প্রতি স্টাফের `dutyDeduction` বের করবে।
- এটি বিদ্যমান `other_deduction`-এ যোগ না করে আলাদা করে নিট থেকে বিয়োগ হবে, `other_deduction_note`-এ "আবাসিক ডিউটি কর্তন" লেখা থাকবে — ফলে ডাবল ডিডাকশন হবে না (salaryNet-এর একই একবার-প্রয়োগ নিয়ম মেনে)।
- বেতন স্লিপ ও salary PDF-এ নতুন লাইন: "− আবাসিক ডিউটি কর্তন (X শিফট)"।
- ব্রেকডাউন ডায়ালগে শিফটভিত্তিক লাইন (তারিখ, শিফট, কারণ, টাকা) দেখানো হবে।

## টেস্ট

`src/lib/__tests__/dutyShiftDeduction.test.ts` — অনুপস্থিতি, বিলম্ব অন/অফ, per_minute ক্যাপ, ছুটির দিন বাদ, ডুপ্লিকেট রেকর্ড, সেটিং না থাকলে ০ — প্রতিটি কেস কভার করবে।

## টেকনিক্যাল ফাইল

- মাইগ্রেশন: `duty_shifts`-এ ৪টি কলাম
- `src/lib/dutyShiftDeduction.ts` (নতুন, pure functions)
- `src/pages/admin/AdminDutyRoster.tsx` (শিফট ফর্ম + তালিকা)
- `src/pages/admin/AdminSalary.tsx` (হিসাব + স্লিপ লাইন)
- `supabase/functions/salary-pdf` (PDF লাইন)
