-- ==============================================================================
-- Expense Institutions Full Details Migration
-- Adds address, phone, email, other_info, logo_url to expense_institutions
-- and syncs existing institutions data
-- ==============================================================================

ALTER TABLE public.expense_institutions
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS other_info TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Sync existing institution details into expense_institutions where matching ID exists
UPDATE public.expense_institutions ei
SET address = COALESCE(ei.address, i.address),
    phone = COALESCE(ei.phone, i.phone),
    email = COALESCE(ei.email, i.email),
    other_info = COALESCE(ei.other_info, i.other_info),
    logo_url = COALESCE(ei.logo_url, i.logo_url)
FROM public.institutions i
WHERE ei.id = i.id;
