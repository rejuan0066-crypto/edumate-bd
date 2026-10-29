-- Migration: Restore original staff IDs & permanently lock staff_id on UPDATE & add missing salary columns

-- 1. Ensure columns exist on salary_records so no schema cache errors happen
ALTER TABLE public.salary_records 
ADD COLUMN IF NOT EXISTS post_resign_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_resign_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pre_join_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pre_join_deduction NUMERIC DEFAULT 0;

-- 2. Permanently lock staff_id on UPDATE - NEVER allow trigger to overwrite existing staff_id
CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
BEGIN
  -- If this is an UPDATE and staff_id was already assigned, NEVER overwrite it!
  IF TG_OP = 'UPDATE' AND OLD.staff_id IS NOT NULL AND trim(OLD.staff_id) <> '' THEN
    -- If admin explicitly and intentionally changed staff_id to something new, allow it
    IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' AND NEW.staff_id <> OLD.staff_id THEN
      RETURN NEW;
    END IF;
    -- Otherwise, lock and preserve the original staff_id
    NEW.staff_id := OLD.staff_id;
    RETURN NEW;
  END IF;

  -- If staff_id is provided by admin on INSERT, keep it
  IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' THEN
    RETURN NEW;
  END IF;

  -- Otherwise, generate ID only for brand new staff
  IF NEW.joining_date IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
  ELSE
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
  END IF;

  NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  RETURN NEW;
END;
$$;

-- 3. Restore all original teacher IDs from the previous records
UPDATE public.staff SET staff_id = 'TCH-2022-2028' WHERE name_bn LIKE '%ফারহান হোসাইন%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2020' WHERE name_bn LIKE '%সাইদুর রহমান%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2018' WHERE name_bn LIKE '%মুখতার হোসাইন%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2029' WHERE name_bn LIKE '%মঈনুল ইসলাম%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2021' WHERE name_bn LIKE '%আবুল বাশার%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2027' WHERE name_bn LIKE '%শাহিনুর রহমান%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2024' WHERE name_bn LIKE '%ইমামুল ইসলাম%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2032' WHERE name_bn LIKE '%শাহিদ আহমদ%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2030' WHERE name_bn LIKE '%আল-ইয়ামিন%' AND deleted_at IS NULL;
UPDATE public.staff SET staff_id = 'TCH-2026-2026' WHERE name_bn LIKE '%সাইফুর রহমান%' AND deleted_at IS NULL;
