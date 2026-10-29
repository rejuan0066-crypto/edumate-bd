-- ==============================================================================
-- 1. FIX TRIGGER: NEVER regenerate or overwrite staff_id on UPDATE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is an UPDATE, NEVER regenerate staff_id!
  -- Keep either NEW.staff_id (if explicitly set) or OLD.staff_id
  IF TG_OP = 'UPDATE' THEN
    IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' THEN
      RETURN NEW;
    END IF;
    IF OLD.staff_id IS NOT NULL AND trim(OLD.staff_id) <> '' THEN
      NEW.staff_id := OLD.staff_id;
      RETURN NEW;
    END IF;
  END IF;

  -- If explicit staff_id provided on INSERT, keep it
  IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' THEN
    RETURN NEW;
  END IF;

  -- Only generate for brand-new staff with no ID
  NEW.staff_id := public.generate_staff_id(
    NEW.staff_category,
    EXTRACT(YEAR FROM COALESCE(NEW.joining_date::DATE, now()::DATE))::INTEGER
  );
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. RESTORE ALL 18 STAFF MEMBERS TO THEIR OFFICIAL ORIGINAL STAFF IDs
-- ==============================================================================

-- ১ মাওলানা ফারহান হোসাইন -> TCH-2026-2007 (and clean duplicated name)
UPDATE public.staff
SET staff_id = 'TCH-2026-2007', name_bn = 'মাওলানা ফারহান হোসাইন'
WHERE name_bn LIKE '%ফারহান হোসাইন%' AND deleted_at IS NULL;

-- ২ মাওলানা সাইদুর রহমান -> TCH-2026-2004
UPDATE public.staff
SET staff_id = 'TCH-2026-2004'
WHERE name_bn LIKE '%সাইদুর রহমান%' AND deleted_at IS NULL;

-- ৩ মাওলানা মুখতার হোসাইন -> TCH-2026-2006
UPDATE public.staff
SET staff_id = 'TCH-2026-2006'
WHERE name_bn LIKE '%মুখতার হোসাইন%' AND deleted_at IS NULL;

-- ৪ মাওলানা মঈনুল ইসলাম -> TCH-2026-2008
UPDATE public.staff
SET staff_id = 'TCH-2026-2008'
WHERE name_bn LIKE '%মঈনুল ইসলাম%' AND deleted_at IS NULL;

-- ৫ মাওলানা আবুল বাশার -> TCH-2026-2009
UPDATE public.staff
SET staff_id = 'TCH-2026-2009'
WHERE name_bn LIKE '%আবুল বাশার%' AND deleted_at IS NULL;

-- ৬ মাওলানা শাহিনুর রহমান -> TCH-2026-2005
UPDATE public.staff
SET staff_id = 'TCH-2026-2005'
WHERE name_bn LIKE '%শাহিনুর রহমান%' AND deleted_at IS NULL;

-- ৭ মাওলানা ইমামুল ইসলাম -> TCH-2026-2012
UPDATE public.staff
SET staff_id = 'TCH-2026-2012'
WHERE name_bn LIKE '%ইমামুল ইসলাম%' AND deleted_at IS NULL;

-- ৮ মাওলানা শহীদ আহমদ -> TCH-2026-2010
UPDATE public.staff
SET staff_id = 'TCH-2026-2010'
WHERE name_bn LIKE '%শহীদ আহমদ%' AND deleted_at IS NULL;

-- ৯ মাস্টার আল-ইয়ামিন -> TCH-2026-2013
UPDATE public.staff
SET staff_id = 'TCH-2026-2013'
WHERE (name_bn LIKE '%ইয়ামিন%' OR name_bn LIKE '%আল-আমিন%' OR name_bn LIKE '%আল আমিন%') AND deleted_at IS NULL;

-- ১০ মাওলানা সাইফুর রহমান -> TCH-2026-2011
UPDATE public.staff
SET staff_id = 'TCH-2026-2011'
WHERE name_bn LIKE '%সাইফুর রহমান%' AND deleted_at IS NULL;

-- ১১ হাফিজ কামরুল ইসলাম -> TCH-2026-2014
UPDATE public.staff
SET staff_id = 'TCH-2026-2014'
WHERE name_bn LIKE '%কামরুল ইসলাম%' AND deleted_at IS NULL;

-- ১২ হাফিজ আরিফুল ইসলাম -> TCH-2026-2016
UPDATE public.staff
SET staff_id = 'TCH-2026-2016'
WHERE name_bn LIKE '%আরিফুল ইসলাম%' AND deleted_at IS NULL;

-- ১৩ হাফিজ আব্দুল কাদির তানজীদ -> TCH-2026-2017
UPDATE public.staff
SET staff_id = 'TCH-2026-2017'
WHERE (name_bn LIKE '%আব্দুল কাদির%' OR name_bn LIKE '%তানজীদ%' OR name_bn LIKE '%তানজিদ%') AND deleted_at IS NULL;

-- ১৪ আসাদুল রহমান -> STF-2026-4001
UPDATE public.staff
SET staff_id = 'STF-2026-4001'
WHERE name_bn LIKE '%আসাদুল রহমান%' AND deleted_at IS NULL;

-- ১৫ কুতুব উদ্দিন -> OFF-2026-3001
UPDATE public.staff
SET staff_id = 'OFF-2026-3001'
WHERE name_bn LIKE '%কুতুব উদ্দিন%' AND deleted_at IS NULL;

-- ১৬ তেরা মিয়া -> OFF-2026-3002
UPDATE public.staff
SET staff_id = 'OFF-2026-3002'
WHERE (name_bn LIKE '%তেরা মিয়া%' OR name_bn LIKE '%তোফা মিয়া%' OR name_bn LIKE '%তোপা মিয়া%') AND deleted_at IS NULL;

-- ১৭ শামিম আহমদ -> CH-2026-5004
UPDATE public.staff
SET staff_id = 'CH-2026-5004'
WHERE name_bn LIKE '%শামিম আহমদ%' AND deleted_at IS NULL;

-- ১৮ সুলতান আহমদ -> CH-2026-5003
UPDATE public.staff
SET staff_id = 'CH-2026-5003'
WHERE name_bn LIKE '%সুলতান আহমদ%' AND deleted_at IS NULL;
