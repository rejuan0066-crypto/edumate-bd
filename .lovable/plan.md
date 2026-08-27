# অভ্যন্তরীণ মেসেজিং সিস্টেম (স্টাফ ↔ অ্যাডমিন + গ্রুপ + ফাইল)

সাইটে লগইন করা যেকোনো ইউজার (স্টাফ, শিক্ষক, প্রশাসনিক, অ্যাডমিন) একে অপরকে সরাসরি মেসেজ পাঠাতে পারবে, অ্যাডমিন গ্রুপ তৈরি করতে পারবে, এবং মেসেজে ফাইল/ছবি/PDF আদান-প্রদান করা যাবে।

## যা তৈরি হবে

### ১. চ্যাট পেজ — `/admin/messages`
- বাম পাশে কথোপকথনের তালিকা (সর্বশেষ মেসেজ, সময়, অপঠিত ব্যাজ), সার্চ
- ডান পাশে চ্যাট থ্রেড: মেসেজ বাবল, সময়, প্রেরকের নাম ও রোল ব্যাজ, পঠিত অবস্থা
- "নতুন মেসেজ" বাটন → ইউজার ডিরেক্টরি (নাম/রোল/পদবি সার্চ) থেকে যেকোনো ব্যক্তি বেছে ১:১ চ্যাট শুরু
- রিয়েলটাইম আপডেট (নতুন মেসেজ সাথে সাথে আসবে), টাইপিং ছাড়া সাধারণ পোলিং/সাবস্ক্রিপশন
- সাইডবারে "মেসেজ" মেনু + অপঠিত সংখ্যার ব্যাজ

### ২. গ্রুপ
- শুধু admin/super_admin গ্রুপ তৈরি/সম্পাদনা/মুছতে পারবে (নাম, বর্ণনা, সদস্য যোগ/বাদ)
- গ্রুপে সব সদস্য মেসেজ পাঠাতে পারবে; সদস্য না হলে কিছুই দেখবে না

### ৩. ফাইল আদান-প্রদান
- ছবি, PDF, ডক, এক্সেল ইত্যাদি সংযুক্তি (সর্বোচ্চ ২০MB প্রতি ফাইল)
- প্রাইভেট স্টোরেজ বাকেট `chat-attachments`; শুধু ওই কথোপকথনের সদস্যরাই signed URL দিয়ে খুলতে পারবে
- ছবির থাম্বনেইল প্রিভিউ, অন্য ফাইলে আইকন + নাম + সাইজ + ডাউনলোড

### ৪. অতিরিক্ত
- অপঠিত গণনা, কথোপকথন খুললে পঠিত হিসেবে চিহ্নিত
- নিজের মেসেজ soft-delete (`deleted_at`), অ্যাডমিন যেকোনোটা মুছতে পারবে
- মোবাইল রেসপন্সিভ (তালিকা ↔ থ্রেড টগল)

## টেকনিক্যাল বিবরণ

নতুন টেবিল (RLS + GRANT সহ):
- `conversations` — `type` ('direct' | 'group'), `title`, `created_by`, `deleted_at`
- `conversation_participants` — `conversation_id`, `user_id`, `role` ('member'|'admin'), `last_read_at`
- `chat_messages` — `conversation_id`, `sender_id`, `body`, `attachments` (jsonb: path/name/size/mime), `deleted_at`

সহায়ক ফাংশন (RLS রিকার্শন এড়াতে security definer):
- `is_conversation_participant(_conv uuid, _user uuid)`
- `get_or_create_direct_conversation(_other_user uuid)` — ডুপ্লিকেট ১:১ থ্রেড হবে না
- `get_messageable_users()` — profiles + staff + administrative_officers থেকে নাম/রোল/পদবিসহ ডিরেক্টরি

RLS: সদস্য হলেই কথোপকথন ও মেসেজ পড়া/লেখা যাবে; গ্রুপ তৈরি ও সদস্য ব্যবস্থাপনা `has_role(auth.uid(),'admin'|'super_admin')`-এ সীমিত; `super_admin` সব দেখতে পারবে।

স্টোরেজ: প্রাইভেট বাকেট `chat-attachments`, পাথ `<conversation_id>/<message_id>/<file>`; বিদ্যমান `can_access_storage_object()` + `request-signed-url` পাইপলাইনে যুক্ত হবে, ডিনায়াল `security_logs`-এ লগ হবে।

ফ্রন্টএন্ড: `src/pages/admin/AdminMessages.tsx` + `src/components/messages/*` (ConversationList, MessageThread, NewConversationDialog, GroupDialog, AttachmentPicker), হুক `useConversations` / `useMessages`, বিদ্যমান গ্লাসমরফিজম/rounded ডিজাইন টোকেন অনুসরণ করে। রুট `App.tsx`-এ `ModuleGuard` দিয়ে যোগ হবে এবং সাইডবারে মেনু আইটেম।
