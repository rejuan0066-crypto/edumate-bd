-- Migration: Automatically synchronize class & division active status to students
-- When a class is deactivated, all students in that class become inactive everywhere.
-- When a class is activated, all students in that class become active.

-- 1. Function and Trigger for classes table
CREATE OR REPLACE FUNCTION public.sync_class_status_to_students()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    UPDATE public.students
    SET status = CASE WHEN NEW.is_active = TRUE THEN 'active' ELSE 'inactive' END,
        updated_at = NOW()
    WHERE class_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_class_status_to_students ON public.classes;
CREATE TRIGGER trg_sync_class_status_to_students
AFTER UPDATE OF is_active ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.sync_class_status_to_students();

-- 2. Function and Trigger for divisions table
CREATE OR REPLACE FUNCTION public.sync_division_status_to_classes_and_students()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Cascade is_active to classes in this division
    UPDATE public.classes
    SET is_active = NEW.is_active
    WHERE division_id = NEW.id;

    -- Cascade status to students in this division
    UPDATE public.students
    SET status = CASE WHEN NEW.is_active = TRUE THEN 'active' ELSE 'inactive' END,
        updated_at = NOW()
    WHERE division_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_division_status ON public.divisions;
CREATE TRIGGER trg_sync_division_status
AFTER UPDATE OF is_active ON public.divisions
FOR EACH ROW
EXECUTE FUNCTION public.sync_division_status_to_classes_and_students();

-- 3. One-time retroactive cleanup of existing records
-- Set students of inactive classes to 'inactive'
UPDATE public.students s
SET status = 'inactive',
    updated_at = NOW()
FROM public.classes c
WHERE s.class_id = c.id
  AND c.is_active = FALSE
  AND s.deleted_at IS NULL
  AND (s.status IS NULL OR s.status = 'active');

-- Set students of inactive divisions to 'inactive'
UPDATE public.students s
SET status = 'inactive',
    updated_at = NOW()
FROM public.divisions d
WHERE s.division_id = d.id
  AND d.is_active = FALSE
  AND s.deleted_at IS NULL
  AND (s.status IS NULL OR s.status = 'active');
