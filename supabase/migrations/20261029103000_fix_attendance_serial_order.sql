-- ==============================================================================
-- FIX SERIAL (salary_order) & STAFF IDs FOR ALL 18 STAFF MEMBERS
-- Sorted strictly by Staff Prefix & ID Number:
-- 1-13: TCH-2026-2004 to TCH-2026-2017
-- 14-15: OFF-2026-3001 to OFF-2026-3002
-- 16: STF-2026-4001
-- 17-18: CH-2026-5003 to CH-2026-5004
-- ==============================================================================

-- ১. মাওলানা সাইদুর রহমান (সহঃ নাজিম ও শিক্ষক) -> TCH-2026-2004
UPDATE public.staff
SET salary_order = 1, staff_id = 'TCH-2026-2004'
WHERE name_bn LIKE '%সাইদুর রহমান%' AND deleted_at IS NULL;

-- ২. মাওলানা শাহিনুর রহমান (সহকারী শিক্ষক ও বোর্ডিং সুপার) -> TCH-2026-2005
UPDATE public.staff
SET salary_order = 2, staff_id = 'TCH-2026-2005'
WHERE name_bn LIKE '%শাহিনুর রহমান%' AND deleted_at IS NULL;

-- ৩. মাওলানা মুখতার হোসাইন (সহকারী শিক্ষক) -> TCH-2026-2006
UPDATE public.staff
SET salary_order = 3, staff_id = 'TCH-2026-2006'
WHERE name_bn LIKE '%মুখতার হোসাইন%' AND deleted_at IS NULL;

-- ৪. মাওলানা ফারহান হোসাইন (নাজিম ও শিক্ষক) -> TCH-2026-2007
UPDATE public.staff
SET salary_order = 4, staff_id = 'TCH-2026-2007', name_bn = 'মাওলানা ফারহান হোসাইন'
WHERE name_bn LIKE '%ফারহান হোসাইন%' AND deleted_at IS NULL;

-- ৫. মাওলানা মঈনুল ইসলাম (সহকারী শিক্ষক) -> TCH-2026-2008
UPDATE public.staff
SET salary_order = 5, staff_id = 'TCH-2026-2008'
WHERE name_bn LIKE '%মঈনুল ইসলাম%' AND deleted_at IS NULL;

-- ৬. মাওলানা আবুল বাশার (সহঃ বোর্ডিং সুপার ও শিক্ষক) -> TCH-2026-2009
UPDATE public.staff
SET salary_order = 6, staff_id = 'TCH-2026-2009'
WHERE name_bn LIKE '%আবুল বাশার%' AND deleted_at IS NULL;

-- ৭. মাওলানা শহীদ আহমদ (সহকারী শিক্ষক) -> TCH-2026-2010
UPDATE public.staff
SET salary_order = 7, staff_id = 'TCH-2026-2010'
WHERE name_bn LIKE '%শহীদ আহমদ%' AND deleted_at IS NULL;

-- ৮. মাওলানা সাইফুর রহমান (সহকারী শিক্ষক) -> TCH-2026-2011
UPDATE public.staff
SET salary_order = 8, staff_id = 'TCH-2026-2011'
WHERE name_bn LIKE '%সাইফুর রহমান%' AND deleted_at IS NULL;

-- ৯. মাওলানা ইমামুল ইসলাম (সহকারী শিক্ষক) -> TCH-2026-2012
UPDATE public.staff
SET salary_order = 9, staff_id = 'TCH-2026-2012'
WHERE name_bn LIKE '%ইমামুল ইসলাম%' AND deleted_at IS NULL;

-- ১০. মাস্টার আল-আমিন / মাষ্টার আল-ইয়ামিন (সহকারী শিক্ষক) -> TCH-2026-2013
UPDATE public.staff
SET salary_order = 10, staff_id = 'TCH-2026-2013'
WHERE (name_bn LIKE '%ইয়ামিন%' OR name_bn LIKE '%আল-আমিন%' OR name_bn LIKE '%আল আমিন%') AND deleted_at IS NULL;

-- ১১. হাফিজ কামরুল ইসলাম (হিফজ প্রধান) -> TCH-2026-2014
UPDATE public.staff
SET salary_order = 11, staff_id = 'TCH-2026-2014'
WHERE name_bn LIKE '%কামরুল ইসলাম%' AND deleted_at IS NULL;

-- ১২. হাফিজ আরিফুল ইসলাম (হিফজ শিক্ষক) -> TCH-2026-2016
UPDATE public.staff
SET salary_order = 12, staff_id = 'TCH-2026-2016'
WHERE name_bn LIKE '%আরিফুল ইসলাম%' AND deleted_at IS NULL;

-- ১৩. হাফিজ আব্দুল কাদির তানজীদ (হিফজ শিক্ষক) -> TCH-2026-2017
UPDATE public.staff
SET salary_order = 13, staff_id = 'TCH-2026-2017'
WHERE (name_bn LIKE '%আব্দুল কাদির%' OR name_bn LIKE '%তানজীদ%' OR name_bn LIKE '%তানজিদ%') AND deleted_at IS NULL;

-- ১৪. কুতুব উদ্দিন (নিরাপত্তা প্রহরী) -> OFF-2026-3001
UPDATE public.staff
SET salary_order = 14, staff_id = 'OFF-2026-3001'
WHERE name_bn LIKE '%কুতুব উদ্দিন%' AND deleted_at IS NULL;

-- ১৫. তেরা মিয়া (অন্যান্য) -> OFF-2026-3002
UPDATE public.staff
SET salary_order = 15, staff_id = 'OFF-2026-3002'
WHERE (name_bn LIKE '%তেরা মিয়া%' OR name_bn LIKE '%তোফা মিয়া%' OR name_bn LIKE '%তোপা মিয়া%') AND deleted_at IS NULL;

-- ১৬. আসাদুল রহমান (অফিস সহকারী) -> STF-2026-4001
UPDATE public.staff
SET salary_order = 16, staff_id = 'STF-2026-4001'
WHERE name_bn LIKE '%আসাদুল রহমান%' AND deleted_at IS NULL;

-- ১৭. সুলতান আহমদ (বাবুর্চি) -> CH-2026-5003
UPDATE public.staff
SET salary_order = 17, staff_id = 'CH-2026-5003'
WHERE name_bn LIKE '%সুলতান আহমদ%' AND deleted_at IS NULL;

-- ১৮. শামিম আহমদ (বাবুর্চি) -> CH-2026-5004
UPDATE public.staff
SET salary_order = 18, staff_id = 'CH-2026-5004'
WHERE name_bn LIKE '%শামিম আহমদ%' AND deleted_at IS NULL;
