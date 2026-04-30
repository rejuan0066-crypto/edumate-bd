-- 1. Add department_id FK column
ALTER TABLE public.administrative_officers
  ADD COLUMN IF NOT EXISTS department_id uuid;

-- 2. Backfill department_id from existing text department (match name or name_bn, case-insensitive)
UPDATE public.administrative_officers ao
SET department_id = d.id
FROM public.administrative_departments d
WHERE ao.department_id IS NULL
  AND ao.department IS NOT NULL
  AND ao.department <> ''
  AND d.deleted_at IS NULL
  AND (lower(d.name) = lower(ao.department) OR lower(d.name_bn) = lower(ao.department));

-- 3. Hard FK constraint (RESTRICT delete to prevent orphaning)
ALTER TABLE public.administrative_officers
  DROP CONSTRAINT IF EXISTS fk_admin_officers_department;
ALTER TABLE public.administrative_officers
  ADD CONSTRAINT fk_admin_officers_department
  FOREIGN KEY (department_id)
  REFERENCES public.administrative_departments(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_admin_officers_department_id
  ON public.administrative_officers(department_id) WHERE deleted_at IS NULL;

-- 4. Trigger: enforce department is active & not soft-deleted; also keep department text in sync from FK
CREATE OR REPLACE FUNCTION public.validate_admin_officer_department_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dept public.administrative_departments%ROWTYPE;
BEGIN
  -- Skip on soft-delete of the officer itself
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If department_id provided, validate it
  IF NEW.department_id IS NOT NULL THEN
    SELECT * INTO v_dept FROM public.administrative_departments WHERE id = NEW.department_id;
    IF v_dept.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: নির্বাচিত বিভাগটি পাওয়া যায়নি।'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF v_dept.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'DEPARTMENT_DELETED: নির্বাচিত বিভাগটি মুছে ফেলা হয়েছে। সক্রিয় বিভাগ নির্বাচন করুন।'
        USING ERRCODE = 'check_violation';
    END IF;
    IF COALESCE(v_dept.is_active, false) = false THEN
      RAISE EXCEPTION 'DEPARTMENT_INACTIVE: নির্বাচিত বিভাগটি নিষ্ক্রিয়। সক্রিয় বিভাগ নির্বাচন করুন।'
        USING ERRCODE = 'check_violation';
    END IF;
    -- Sync text department from FK (Bangla name preferred)
    NEW.department := COALESCE(v_dept.name_bn, v_dept.name);
  ELSIF NEW.department IS NOT NULL AND NEW.department <> '' THEN
    -- If only text provided, resolve to active department
    SELECT * INTO v_dept FROM public.administrative_departments
     WHERE deleted_at IS NULL
       AND (lower(name) = lower(NEW.department) OR lower(name_bn) = lower(NEW.department))
     LIMIT 1;
    IF v_dept.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: "%" নামের কোনো সক্রিয় বিভাগ পাওয়া যায়নি।', NEW.department
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF COALESCE(v_dept.is_active, false) = false THEN
      RAISE EXCEPTION 'DEPARTMENT_INACTIVE: "%" বিভাগটি নিষ্ক্রিয়।', NEW.department
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.department_id := v_dept.id;
    NEW.department := COALESCE(v_dept.name_bn, v_dept.name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_officer_department_ref ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_department_ref
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_department_ref();

-- 5. Prevent deactivating/soft-deleting a department that still has active officers
CREATE OR REPLACE FUNCTION public.guard_department_in_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Soft-delete attempt
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.administrative_officers
     WHERE department_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DEPARTMENT_IN_USE: এই বিভাগে % জন সক্রিয় কর্মকর্তা আছেন। প্রথমে তাঁদের অন্য বিভাগে সরান।', v_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Deactivation attempt
  IF COALESCE(OLD.is_active, true) = true AND COALESCE(NEW.is_active, true) = false THEN
    SELECT COUNT(*) INTO v_count FROM public.administrative_officers
     WHERE department_id = OLD.id AND deleted_at IS NULL AND status = 'active';
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DEPARTMENT_IN_USE: এই বিভাগে % জন সক্রিয় কর্মকর্তা আছেন। নিষ্ক্রিয় করার আগে তাঁদের সরান।', v_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_department_in_use ON public.administrative_departments;
CREATE TRIGGER trg_guard_department_in_use
  BEFORE UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.guard_department_in_use();