## লক্ষ্য
হাজিরা পেইজে সরাসরি সব ছাত্র একসাথে না দেখিয়ে ধাপে ধাপে drill-down করা হবে:

1. **ধাপ ১** — হাজিরা ট্যাবে ক্লিক করলে প্রথমে শুধু **ক্লাসের তালিকা** (card grid) দেখাবে (প্রতিটি ক্লাসে মোট ছাত্র সংখ্যা + আজকের হাজিরা summary সহ)।
2. **ধাপ ২** — কোনো ক্লাস কার্ডে ক্লিক করলে ঐ ক্লাসের **ছাত্রদের তালিকা ও হাজিরা অপশন** (Present / Absent / Late / Leave) দেখাবে।
3. উপরে একটি **Breadcrumb / Back button** থাকবে: `হাজিরা › ক্লাস ৬ (ছাত্র)` — যাতে সহজে ক্লাস লিস্টে ফিরে যাওয়া যায়।

## পরিবর্তনের জায়গা

- `src/pages/admin/AdminAttendance.tsx` (বা যেখানে student attendance render হচ্ছে — `AdminStudentAttendance` এর underlying component)।
- একটি নতুন internal state: `selectedClassId | null`।
  - `null` হলে → Class Grid দেখাবে।
  - সেট থাকলে → বর্তমান student attendance UI দেখাবে সাথে back button।

## Class Grid ডিজাইন

- Session picker উপরে থাকবে (আগের মতোই)।
- Responsive grid (mobile 2 col, md 3, lg 4)।
- প্রতিটি কার্ডে:
  - ক্লাসের নাম (BN/EN)
  - মোট ছাত্র
  - আজকের: উপস্থিত / অনুপস্থিত / দেরি (ছোট badge)
  - Chevron আইকন
- Card hover: existing enterprise style (`-translate-y-[3px]`, shadow)।

## স্টাফ হাজিরা
- শুধু **ছাত্র হাজিরা**-তে এই drill-down applied হবে। Staff attendance-এ ক্লাস concept নেই, তাই unchanged।

## Data
- Class list: `classes` table (আগেই fetch হয়)।
- আজকের summary: `attendance_records` থেকে আজকের তারিখে filter করে ক্লাস অনুযায়ী aggregate — একটি হালকা query।
- ছাত্র লিস্ট শুধু selected class-এর জন্য fetch হবে (performance ভালো হবে)।

## Permission / URL
- Optional: URL query `?class=<id>` sync করে refresh-এ state ধরে রাখা যাবে (nice-to-have)।
- Existing permission gating অক্ষুণ্ণ থাকবে।

অনুমোদন দিলে কোড করা শুরু করব।