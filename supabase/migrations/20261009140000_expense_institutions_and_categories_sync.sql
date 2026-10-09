-- ==============================================================================
-- Expense Institutions and Categories Sync Migration
-- Ensures:
--  1. Anyone (public and authenticated) can view expense_institutions
--  2. Institutions from public.institutions are mirrored into public.expense_institutions
--  3. Orphan expense categories are linked to the default institution
-- ==============================================================================

-- 1. Policy: Allow public to view expense_institutions (consistent with institutions and expense_categories)
DROP POLICY IF EXISTS "Anyone can view expense_institutions" ON public.expense_institutions;
CREATE POLICY "Anyone can view expense_institutions"
  ON public.expense_institutions FOR SELECT
  TO public
  USING (true);

-- 2. Sync existing institutions into expense_institutions with matching IDs
INSERT INTO public.expense_institutions (id, name, name_bn)
SELECT id, COALESCE(name_en, name), name
FROM public.institutions
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    name_bn = EXCLUDED.name_bn;

-- 3. Link existing categories without a valid institution to the default institution
DO $$
DECLARE
  default_inst_id UUID;
BEGIN
  SELECT id INTO default_inst_id FROM public.institutions WHERE is_default = true LIMIT 1;
  IF default_inst_id IS NULL THEN
    SELECT id INTO default_inst_id FROM public.institutions ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF default_inst_id IS NOT NULL THEN
    -- Ensure default institution exists in expense_institutions
    INSERT INTO public.expense_institutions (id, name, name_bn)
    SELECT id, COALESCE(name_en, name), name
    FROM public.institutions WHERE id = default_inst_id
    ON CONFLICT (id) DO NOTHING;

    -- Re-link any categories pointing to non-existent institutions or null
    UPDATE public.expense_categories
    SET institution_id = default_inst_id
    WHERE institution_id IS NULL 
       OR institution_id NOT IN (SELECT id FROM public.expense_institutions);
  END IF;
END $$;
