-- Migration: 20261019010000_prevent_duplicate_serials_and_receipts.sql
-- Description: Implement atomic serial number generators and UNIQUE constraints for
-- 1. Resignation letters (RL-YYYY-XXX)
-- 2. Joining & Reinstatement letters (JL-YYYY-XXX)
-- 3. Student roll numbers (numeric atomic sequence per class/session)
-- 4. Fee payment receipt numbers (SL-YYYY-XXXX auto-assigned via BEFORE INSERT trigger)
-- 5. Deduplication and UNIQUE indexes on all serial fields

-- ============================================================================
-- 1. RECEIPT COUNTER & FEE PAYMENTS ATOMIC RECEIPT NUMBER
-- ============================================================================

-- Ensure receipt_counter table exists and has initial record
CREATE TABLE IF NOT EXISTS public.receipt_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL DEFAULT 'SL',
  current_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initialize receipt_counter row if not present
INSERT INTO public.receipt_counter (prefix, current_year, last_number)
SELECT 'SL', EXTRACT(YEAR FROM now())::integer, 0
WHERE NOT EXISTS (SELECT 1 FROM public.receipt_counter);

-- Robust atomic function for receipt serial
CREATE OR REPLACE FUNCTION public.get_next_receipt_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_year integer;
  v_next integer;
  v_current_year integer;
BEGIN
  v_current_year := EXTRACT(YEAR FROM now())::integer;
  
  -- Lock row for update
  SELECT prefix, current_year, last_number
  INTO v_prefix, v_year, v_next
  FROM public.receipt_counter
  LIMIT 1
  FOR UPDATE;
  
  -- If empty somehow, insert and lock
  IF v_prefix IS NULL THEN
    INSERT INTO public.receipt_counter (prefix, current_year, last_number)
    VALUES ('SL', v_current_year, 0)
    RETURNING prefix, current_year, last_number
    INTO v_prefix, v_year, v_next;
  END IF;
  
  -- If year changed, reset counter
  IF v_year != v_current_year THEN
    v_next := 1;
    UPDATE public.receipt_counter
    SET current_year = v_current_year, last_number = 1, updated_at = now();
  ELSE
    v_next := v_next + 1;
    UPDATE public.receipt_counter
    SET last_number = v_next, updated_at = now();
  END IF;
  
  RETURN v_prefix || '-' || v_current_year::text || '-' || lpad(v_next::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO anon, authenticated;

-- BEFORE INSERT trigger on fee_payments: automatically assign receipt_number if omitted
CREATE OR REPLACE FUNCTION public.auto_assign_fee_payment_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR trim(NEW.receipt_number) = '' THEN
    NEW.receipt_number := public.get_next_receipt_serial();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_fee_receipt_number ON public.fee_payments;
CREATE TRIGGER trg_auto_assign_fee_receipt_number
  BEFORE INSERT ON public.fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_fee_payment_receipt_number();

-- Deduplicate any existing duplicate fee payment receipt numbers safely
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT receipt_number
    FROM public.fee_payments
    WHERE receipt_number IS NOT NULL AND trim(receipt_number) != '' AND (deleted_at IS NULL)
    GROUP BY receipt_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.fee_payments
      WHERE receipt_number = r.receipt_number AND deleted_at IS NULL
    )
    UPDATE public.fee_payments fp
    SET receipt_number = fp.receipt_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE fp.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on fee_payments(receipt_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_payments_receipt_number
ON public.fee_payments (receipt_number)
WHERE deleted_at IS NULL AND receipt_number IS NOT NULL AND trim(receipt_number) != '';


-- ============================================================================
-- 2. RESIGNATION LETTERS (RL-YYYY-XXX) ATOMIC GENERATOR & CONSTRAINT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_resignation_letter_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq int;
  v_letter_no text;
  v_attempt int := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::text;
  
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN letter_number ~ ('^RL-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(letter_number, '^RL-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.resign_letters
    WHERE letter_number LIKE 'RL-' || v_year || '-%';

    v_letter_no := 'RL-' || v_year || '-' || lpad(v_seq::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.resign_letters WHERE letter_number = v_letter_no) THEN
      RETURN v_letter_no;
    END IF;

    IF v_attempt > 25 THEN
      RETURN 'RL-' || v_year || '-' || lpad((v_seq + v_attempt)::text, 3, '0');
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_resignation_letter_number() TO authenticated, anon;

-- Auto-assign trigger on resign_letters
CREATE OR REPLACE FUNCTION public.auto_assign_resignation_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.letter_number IS NULL OR trim(NEW.letter_number) = '' THEN
    NEW.letter_number := public.generate_resignation_letter_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_resignation_letter_number ON public.resign_letters;
CREATE TRIGGER trg_auto_assign_resignation_letter_number
  BEFORE INSERT ON public.resign_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_resignation_letter_number();

-- Deduplicate existing resign_letters duplicates
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT letter_number
    FROM public.resign_letters
    WHERE letter_number IS NOT NULL AND trim(letter_number) != ''
    GROUP BY letter_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.resign_letters
      WHERE letter_number = r.letter_number
    )
    UPDATE public.resign_letters rl
    SET letter_number = rl.letter_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE rl.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on resign_letters(letter_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_resign_letters_letter_number
ON public.resign_letters(letter_number)
WHERE letter_number IS NOT NULL AND trim(letter_number) != '';


-- ============================================================================
-- 3. JOINING & REINSTATEMENT LETTERS (JL-YYYY-XXX) ATOMIC GENERATOR & CONSTRAINT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_joining_letter_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq int;
  v_letter_no text;
  v_attempt int := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::text;
  
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN letter_number ~ ('^JL-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(letter_number, '^JL-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.joining_letters
    WHERE letter_number LIKE 'JL-' || v_year || '-%';

    v_letter_no := 'JL-' || v_year || '-' || lpad(v_seq::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.joining_letters WHERE letter_number = v_letter_no) THEN
      RETURN v_letter_no;
    END IF;

    IF v_attempt > 25 THEN
      RETURN 'JL-' || v_year || '-' || lpad((v_seq + v_attempt)::text, 3, '0');
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_joining_letter_number() TO authenticated, anon;

-- Auto-assign trigger on joining_letters
CREATE OR REPLACE FUNCTION public.auto_assign_joining_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.letter_number IS NULL OR trim(NEW.letter_number) = '' THEN
    NEW.letter_number := public.generate_joining_letter_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_joining_letter_number ON public.joining_letters;
CREATE TRIGGER trg_auto_assign_joining_letter_number
  BEFORE INSERT ON public.joining_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_joining_letter_number();

-- Deduplicate existing joining_letters duplicates (e.g. JL-2026-002)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT letter_number
    FROM public.joining_letters
    WHERE letter_number IS NOT NULL AND trim(letter_number) != ''
    GROUP BY letter_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.joining_letters
      WHERE letter_number = r.letter_number
    )
    UPDATE public.joining_letters jl
    SET letter_number = jl.letter_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE jl.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on joining_letters(letter_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_joining_letters_letter_number
ON public.joining_letters(letter_number)
WHERE letter_number IS NOT NULL AND trim(letter_number) != '';


-- ============================================================================
-- 4. STUDENT ROLL NUMBER ATOMIC GENERATOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_next_student_roll(
  p_class_id uuid,
  p_session_id uuid DEFAULT NULL,
  p_session_year text DEFAULT NULL,
  p_roll_start int DEFAULT 1001
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_roll int;
  v_roll_prefix int;
  v_next_roll int;
BEGIN
  IF p_roll_start IS NULL OR p_roll_start <= 0 THEN
    p_roll_start := 1001;
  END IF;

  v_roll_prefix := floor(p_roll_start / 1000)::int;

  -- Select maximum numeric roll cleanly using regex to avoid text comparison bugs ('99' > '100')
  SELECT COALESCE(MAX(
    CASE WHEN roll_number ~ '^[0-9]+$' 
         THEN roll_number::integer 
         ELSE 0 END
  ), p_roll_start - 1)
  INTO v_max_roll
  FROM public.students
  WHERE (class_id = p_class_id OR (roll_number ~ '^[0-9]+$' AND roll_number::integer >= p_roll_start AND roll_number::integer < (v_roll_prefix + 1) * 1000))
    AND (deleted_at IS NULL)
    AND (
      (p_session_id IS NOT NULL AND session_id = p_session_id) OR
      (p_session_year IS NOT NULL AND (session_year = p_session_year OR admission_session = p_session_year)) OR
      (p_session_id IS NULL AND p_session_year IS NULL)
    );

  IF v_max_roll < p_roll_start - 1 THEN
    v_max_roll := p_roll_start - 1;
  END IF;

  v_next_roll := v_max_roll + 1;

  -- Ensure collision avoidance against any pending or in-flight records
  WHILE EXISTS (
    SELECT 1 FROM public.students
    WHERE roll_number = v_next_roll::text
      AND deleted_at IS NULL
      AND (
        (p_session_id IS NOT NULL AND session_id = p_session_id) OR
        (p_session_year IS NOT NULL AND (session_year = p_session_year OR admission_session = p_session_year)) OR
        class_id = p_class_id
      )
  ) LOOP
    v_next_roll := v_next_roll + 1;
  END LOOP;

  RETURN v_next_roll::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_student_roll(uuid, uuid, text, int) TO authenticated, anon;
