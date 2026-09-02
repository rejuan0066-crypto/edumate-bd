# মুহতামিম/প্রিন্সিপালের নামের একক উৎস (Single Source of Truth)

## সমস্যা কী (যাচাই করা)

সাইটে প্রিন্সিপালের নাম এখন **তিন-চার জায়গা থেকে** আসে, তাই একেক জায়গায় একেক রকম দেখায়:

| উৎস | বর্তমান মান |
|---|---|
| `administrative_officers` (পদবী: প্রতিষ্ঠাতা ও প্রিন্সিপাল) | আলহাজ্ব আব্দুছ ছোবহান |
| `website_settings.principal_name` | আব্দুছ ছোবহান |
| `website_settings.idcard_principal_name` | প্রিন্সিপাল আব্দুছ ছোবহান |
| `institutions.principal_name` | খালি (NULL) |

**মোবাইলে "আলহাজ্ব" না আসার আসল কারণ:** `administrative_officers` টেবিলের রিড পারমিশন শুধু লগইন করা অ্যাডমিনের জন্য। কম্পিউটারে আপনি অ্যাডমিন হিসেবে লগইন থাকায় অফিসারের নাম (আলহাজ্ব সহ) আসে; মোবাইলে লগআউট অবস্থায় ওই ডাটা ব্লক হয় → পুরনো `website_settings` মান দেখায়। কোড ঠিক আছে, ডাটা-অ্যাক্সেসই আলাদা ফল দিচ্ছে।

## সমাধানের পরিকল্পনা

### ১) পাবলিক ভাবে নিরাপদ প্রিন্সিপাল তথ্য
`administrative_officers`-এর পুরো টেবিল পাবলিক করা হবে না (ফোন/NID/বেতন সংবেদনশীল)। এর বদলে একটি রিড-অনলি ফাংশন তৈরি হবে যা শুধু প্রিন্সিপাল/মুহতামিম-এর নাম (বাংলা/ইংরেজি), পদবী ও ছবি ফেরত দেয় — লগইন ছাড়াও কাজ করবে। ফলে মোবাইল ও কম্পিউটারে একই নাম দেখাবে।

### ২) সব জায়গায় এক উৎস
একটি অভিন্ন হুক/হেল্পার (`usePrincipalOfficer` + `useInstitutionInfo`) থাকবে, যা এই অগ্রাধিকার মানবে:

```text
প্রিন্সিপাল অফিসার রেকর্ড  →  institutions.principal_name  →  website_settings.principal_name
```

এই একই উৎস ব্যবহার করবে: হোম পেজ, About, আইডি কার্ড, সার্টিফিকেট, মার্কশিট/রেজাল্ট, ফি রসিদ, বেতন শিট/স্লিপ, জয়েনিং/রিজাইন লেটার, ছাত্র প্রোফাইল প্রিন্ট ও অন্যান্য PDF।

### ৩) আলাদা/ডুপ্লিকেট ফিল্ড বাতিল
- `idcard_principal_name` / `idcard_principal_name_en` আলাদা করে রাখা হবে না — আইডি কার্ডও মূল উৎস থেকে নাম নেবে (পদবী আলাদা ফিল্ড থেকে)।
- `institutions.principal_name` ও `website_settings.principal_name` অফিসার রেকর্ড থেকে সিঙ্ক করে দেওয়া হবে, যাতে পুরনো ক্যাশ/ফলব্যাকেও ভুল নাম না থাকে।

### ৪) অ্যাডমিন প্যানেলে স্পষ্টতা
প্রতিষ্ঠানের তথ্য সম্পাদনায় দেখাবে: "নামটি প্রশাসনিক কর্মকর্তা রেকর্ড থেকে স্বয়ংক্রিয়ভাবে আসছে — পরিবর্তন করতে সেখানেই সম্পাদনা করুন" (ইনপুট লকড থাকবে, লিংক সহ)। ফলে ভবিষ্যতে কোডিং ছাড়াই এক জায়গায় নাম বদলালে সব ফরম/PDF-এ বদলে যাবে।

## টেকনিক্যাল বিবরণ
- নতুন SECURITY DEFINER RPC `get_public_principal()` (name_bn, name_en, designation, photo_url) + anon/authenticated EXECUTE grant; শুধু active, non-deleted, প্রিন্সিপাল/মুহতামিম/অধ্যক্ষ কীওয়ার্ড ম্যাচ।
- `src/hooks/usePrincipalOfficer.ts` → সরাসরি টেবিল কোয়েরির বদলে RPC কল; ব্যর্থ হলে বর্তমান টেবিল-কোয়েরি ফলব্যাক (লগইন অ্যাডমিনের জন্য)।
- `src/hooks/useInstitutionInfo.ts` ও `src/hooks/useWebsiteSettings.ts` একই RPC-ভিত্তিক মান ব্যবহার করবে, যাতে ক্যাশড সেটিংসও সঠিক নাম পায়।
- `src/pages/admin/AdminIdCards.tsx`, `StaffIdCard`, `StudentIdCard`, `certificateTemplate.ts`, `receiptPrintLayouts.ts`, `studentProfilePrint.ts`, `AdminSalary`, `AdminJoiningLetters`, `AdminResignLetters`, `AdminCertificates` — সবাই `useInstitutionInfo().principal_name` ব্যবহার করবে।
- এককালীন ডাটা সিঙ্ক মাইগ্রেশন: `institutions.principal_name`/`principal_name_en` ও `website_settings.principal_name*`-এ অফিসার রেকর্ডের মান বসানো; `idcard_principal_name*` কী অপসারণ।
- এজ ফাংশন (`salary-pdf`, `staff-letter-pdf`) একই অগ্রাধিকার অনুসরণ করবে।
