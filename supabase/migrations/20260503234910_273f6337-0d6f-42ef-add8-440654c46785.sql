
CREATE TABLE IF NOT EXISTS public.salary_sheet_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL UNIQUE,
  memo_no text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.salary_sheet_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read salary memos"
  ON public.salary_sheet_memos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage salary memos"
  ON public.salary_sheet_memos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.get_or_create_salary_memo(p_month_year text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memo text;
  v_year text;
  v_month text;
  v_seq int;
  v_attempt int := 0;
BEGIN
  IF p_month_year IS NULL OR length(p_month_year) < 7 THEN
    RAISE EXCEPTION 'Invalid month_year: %', p_month_year;
  END IF;

  SELECT memo_no INTO v_memo
  FROM public.salary_sheet_memos
  WHERE month_year = p_month_year;

  IF v_memo IS NOT NULL THEN
    RETURN v_memo;
  END IF;

  v_year := split_part(p_month_year, '-', 1);
  v_month := split_part(p_month_year, '-', 2);

  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN memo_no ~ ('^SS-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(memo_no, '^SS-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.salary_sheet_memos
    WHERE memo_no LIKE 'SS-' || v_year || '-%';

    v_memo := 'SS-' || v_year || '-' || lpad(v_seq::text, 4, '0');

    BEGIN
      INSERT INTO public.salary_sheet_memos (month_year, memo_no, created_by)
      VALUES (p_month_year, v_memo, auth.uid());
      RETURN v_memo;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT memo_no INTO v_memo
        FROM public.salary_sheet_memos
        WHERE month_year = p_month_year;
        IF v_memo IS NOT NULL THEN
          RETURN v_memo;
        END IF;
        IF v_attempt > 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_salary_memo(text) TO authenticated, anon, service_role;
