# SaaS রূপান্তর পরিকল্পনা (Multi-tenant)

লক্ষ্য: এক সিস্টেমে অনেক প্রতিষ্ঠান (মাদ্রাসা/স্কুল), প্রতিটির ডাটা সম্পূর্ণ আলাদা ও নিরাপদ, ভবিষ্যতে সাবস্ক্রিপশন দিয়ে বিক্রয়যোগ্য।

কৌশল: **Shared database + `tenant_id`** — একই ডাটাবেজ, প্রতিটি সারিতে প্রতিষ্ঠান-চিহ্ন, RLS দিয়ে বিচ্ছিন্নকরণ। খরচ সবচেয়ে কম, রক্ষণাবেক্ষণ সহজ।

---

## ধাপ ১ — ভিত্তি (বর্তমান সিস্টেম অক্ষত থাকবে)

- `tenants` টেবিল: নাম, subdomain/slug, লোগো, status, plan, trial_ends_at
- `tenant_users` টেবিল: কোন ইউজার কোন প্রতিষ্ঠানে, কোন role-এ
- `current_tenant_id()` security-definer ফাংশন: JWT/সেশন থেকে চলতি tenant বের করবে
- বর্তমান প্রতিষ্ঠানকে "default tenant" হিসেবে insert, সব বিদ্যমান ইউজারকে তাতে যুক্ত
- `platform_admin` role: সব tenant দেখতে/পরিচালনা করতে পারবে (আপনি)

এই ধাপে কোনো বিদ্যমান পেজ ভাঙবে না।

## ধাপ ২ — Tenant Context (ফ্রন্টএন্ড)

- `TenantProvider` context + `useTenant()` hook
- প্রতিষ্ঠান নির্বাচন/স্যুইচার (একাধিক প্রতিষ্ঠানে থাকা ইউজারের জন্য)
- Subdomain routing: `abcmadrasah.example.com` → নির্দিষ্ট tenant
- সব branding (লোগো, নাম, রঙ, প্রিন্সিপাল নাম) tenant থেকে আসবে — `website_settings`, `institutions`, `app_settings` tenant-scoped হবে

## ধাপ ৩ — মডিউল-ভিত্তিক Migration

প্রতিটি মডিউলে: `tenant_id` কলাম যোগ → default tenant দিয়ে backfill → NOT NULL → index → RLS policy-তে `tenant_id = current_tenant_id()` যোগ → ফ্রন্টএন্ড query-তে filter।

ক্রম (নির্ভরতা অনুযায়ী):
1. Core: divisions, academic_sessions, classes, subjects
2. People: students, staff, administrative_officers, parent_accounts, student_accounts
3. Academic: results, exam_sessions, routines, question_papers, promotion
4. Finance: fee_types, fee_payments, expenses, salary_*, donors, budgets
5. Ops: library, hostel, attendance, duty, health, committees, complaints
6. Config: settings, templates, permissions, id_format, translations
7. Logs/audit: সব `*_audit`, `*_log` টেবিল

## ধাপ ৪ — Storage ও Edge Functions

- Storage path: `tenant/<tenant_id>/photos/...` — `can_access_storage_object()` tenant চেক করবে
- সব edge function-এ tenant resolve + যাচাই (`_shared/tenant.ts`)
- Cron/backup ফাংশন tenant-aware

## ধাপ ৫ — বিক্রয় ও বিলিং

- `subscription_plans` (Basic/Standard/Premium) ও `tenant_subscriptions`
- Plan limit: ছাত্রসংখ্যা, স্টাফসংখ্যা, স্টোরেজ, কোন মডিউল চালু
- পেমেন্ট: bKash/নগদ ম্যানুয়াল + Stripe (আন্তর্জাতিক)
- Trial → Active → Past due → Suspended lifecycle, মেয়াদ শেষে read-only

## ধাপ ৬ — Platform Admin Panel

- `/platform` — tenant তালিকা, নতুন tenant তৈরি (onboarding wizard), plan পরিবর্তন, সাসপেন্ড
- Tenant-ভিত্তিক ব্যবহার পরিসংখ্যান ও বিলিং ইতিহাস
- Impersonate (সাপোর্টের জন্য, audit log সহ)

## ধাপ ৭ — Self-serve Onboarding

- পাবলিক signup → প্রতিষ্ঠান তৈরি → ডেমো/সিড ডাটা → প্রথম অ্যাডমিন অ্যাকাউন্ট
- Tenant-ভিত্তিক ইমেইল টেমপ্লেট ও domain

---

## প্রযুক্তিগত নোট

- ~২০০ টেবিল, ~৬০০+ RLS policy পুনর্লিখন লাগবে — তাই মডিউল ধরে ধরে করা হবে
- প্রতিটি tenant-scoped টেবিলে `(tenant_id, ...)` composite index — না দিলে পারফরম্যান্স পড়বে
- UNIQUE constraint গুলো tenant-scoped করতে হবে (যেমন roll number, staff_id, receipt serial প্রতি tenant-এ আলাদা গণনা)
- `has_role()` ও `has_menu_permission()` tenant-aware করতে হবে
- প্রতিটি ধাপ শেষে দুই tenant দিয়ে ক্রস-লিক টেস্ট (একজনের ডাটা অন্যজন দেখতে পারে কিনা)

## ঝুঁকি

- Migration চলাকালীন backfill ভুল হলে ডাটা মিশে যেতে পারে → প্রতি ধাপের আগে backup
- Receipt/ID serial generator tenant-scoped না করলে নম্বর সংঘর্ষ হবে
- পুরো কাজ একবারে নয়; ধাপ ১–২ আগে, বাকিগুলো প্রয়োজন অনুযায়ী

## সুপারিশ

এখনই ধাপ ১ ও ২ করে রাখুন (কম ঝুঁকি, বর্তমান সিস্টেম চলতে থাকবে)। প্রথম ক্রেতা পাওয়ার সময় ধাপ ৩–৭ চালানো হবে।
