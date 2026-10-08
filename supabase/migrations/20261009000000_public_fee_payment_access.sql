-- ==============================================================================
-- Public Fee Payment and Receipt Search Migration
-- Allows unauthenticated visitors to:
--  1. Safely search students by session, class, roll/reg without exposing sensitive data
--  2. View their own paid receipts by session, class, roll/reg or receipt number
--  3. Submit online pending payment requests
-- ==============================================================================

-- 1. Grant deleted_at to anon on students so queries checking soft deletion never fail with 42501
GRANT SELECT (deleted_at) ON public.students TO anon;

-- 2. Allow public to view basic student information for fee verification
DROP POLICY IF EXISTS "Public can view active students for fee lookup" ON public.students;
CREATE POLICY "Public can view active students for fee lookup"
  ON public.students FOR SELECT
  TO anon
  USING (
    COALESCE(status, 'active') = 'active'
    AND deleted_at IS NULL
  );

-- 3. Allow public to view paid receipts and submit pending payment requests
DROP POLICY IF EXISTS "Public can view paid fee receipts" ON public.fee_payments;
CREATE POLICY "Public can view paid fee receipts"
  ON public.fee_payments FOR SELECT
  TO anon
  USING (
    status = 'paid'
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Public can insert fee payments" ON public.fee_payments;
CREATE POLICY "Public can insert fee payments"
  ON public.fee_payments FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
  );

DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
CREATE POLICY "Public can insert payments"
  ON public.payments FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
  );

-- 4. Dedicated Security Definer function to search students for fee payment
CREATE OR REPLACE FUNCTION public.public_search_student_for_fee(
  p_identifier text,
  p_session_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name_bn text,
  name_en text,
  student_id text,
  roll_number text,
  registration_no text,
  class_id uuid,
  session_id uuid,
  division_id uuid,
  photo_url text,
  status text,
  class_name text,
  class_name_bn text,
  session_name text,
  session_name_bn text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id, s.name_bn, s.name_en, s.student_id, s.roll_number, s.registration_no,
    s.class_id, s.session_id, s.division_id, s.photo_url, s.status,
    c.name AS class_name, c.name_bn AS class_name_bn,
    ses.name AS session_name, ses.name_bn AS session_name_bn
  FROM public.students s
  LEFT JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.academic_sessions ses ON ses.id = s.session_id
  WHERE s.deleted_at IS NULL
    AND COALESCE(s.status, 'active') = 'active'
    AND (p_session_id IS NULL OR s.session_id = p_session_id)
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
    AND (
      s.roll_number = btrim(p_identifier)
      OR s.student_id = btrim(p_identifier)
      OR s.registration_no = btrim(p_identifier)
      OR s.birth_reg_no = btrim(p_identifier)
    )
  LIMIT 5;
$$;
REVOKE ALL ON FUNCTION public.public_search_student_for_fee(text, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_search_student_for_fee(text, uuid, uuid) TO anon, authenticated;

-- 5. Dedicated Security Definer function to retrieve student's paid receipts
CREATE OR REPLACE FUNCTION public.public_search_student_receipts(
  p_identifier text,
  p_session_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  receipt_number text,
  student_id uuid,
  student_name text,
  student_code text,
  class_name text,
  roll text,
  fee_type text,
  fee_type_bn text,
  amount numeric,
  paid_amount numeric,
  status text,
  paid_at timestamptz,
  month text,
  year integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    fp.id,
    COALESCE(fp.receipt_number, 'RCP-' || UPPER(SUBSTRING(fp.id::text, 1, 8))) AS receipt_number,
    s.id AS student_id,
    COALESCE(s.name_bn, s.name_en, '') AS student_name,
    COALESCE(s.student_id, s.registration_no, '') AS student_code,
    COALESCE(c.name_bn, c.name, '') AS class_name,
    COALESCE(s.roll_number, '') AS roll,
    ft.name AS fee_type,
    ft.name_bn AS fee_type_bn,
    fp.amount,
    COALESCE(fp.paid_amount, fp.amount) AS paid_amount,
    fp.status,
    fp.paid_at,
    fp.month,
    fp.year
  FROM public.fee_payments fp
  JOIN public.students s ON s.id = fp.student_id
  LEFT JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
  WHERE fp.status = 'paid'
    AND fp.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND (p_session_id IS NULL OR s.session_id = p_session_id)
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
    AND (p_year IS NULL OR fp.year = p_year)
    AND (
      s.roll_number = btrim(p_identifier)
      OR s.student_id = btrim(p_identifier)
      OR s.registration_no = btrim(p_identifier)
      OR fp.receipt_number ILIKE '%' || btrim(p_identifier) || '%'
    )
  ORDER BY fp.paid_at DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.public_search_student_receipts(text, uuid, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.public_search_student_receipts(text, uuid, uuid, integer) TO anon, authenticated;
