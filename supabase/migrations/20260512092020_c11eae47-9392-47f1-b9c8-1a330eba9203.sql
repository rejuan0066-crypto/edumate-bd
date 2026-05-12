CREATE OR REPLACE FUNCTION public.auto_generate_student_roll_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_roll text;
  v_year text;
  v_session_name text;
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN

    -- Generate roll if missing, using site formula (get_next_admission_roll)
    IF (NEW.roll_number IS NULL OR btrim(NEW.roll_number) = '')
       AND NEW.class_id IS NOT NULL
       AND NEW.session_id IS NOT NULL THEN
      BEGIN
        v_next_roll := public.get_next_admission_roll(NEW.class_id, NEW.session_id);
        IF v_next_roll IS NOT NULL AND btrim(v_next_roll) <> '' THEN
          NEW.roll_number := v_next_roll;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto roll generation failed: %', SQLERRM;
      END;
    END IF;

    -- Derive session year if missing
    IF NEW.session_year IS NULL OR btrim(NEW.session_year) = '' THEN
      SELECT name INTO v_session_name FROM public.academic_sessions WHERE id = NEW.session_id;
      IF v_session_name IS NOT NULL THEN
        v_year := substring(regexp_replace(v_session_name, '[^0-9]', '', 'g') from 1 for 4);
        IF v_year <> '' THEN
          NEW.session_year := v_year;
        END IF;
      END IF;
    END IF;

    -- Generate registration_no if missing (SessionYear + Roll)
    IF (NEW.registration_no IS NULL OR btrim(NEW.registration_no) = '')
       AND NEW.session_year IS NOT NULL
       AND NEW.roll_number IS NOT NULL THEN
      NEW.registration_no := substring(NEW.session_year from 1 for 4) || NEW.roll_number;
    END IF;

    -- Replace placeholder student_id (STU-xxxxx) with registration_no
    IF NEW.registration_no IS NOT NULL
       AND (NEW.student_id IS NULL OR NEW.student_id LIKE 'STU-%') THEN
      NEW.student_id := NEW.registration_no;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;