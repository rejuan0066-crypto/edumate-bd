-- Add optional staff link to committee_members
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_committee_members_staff_id 
  ON public.committee_members(staff_id) 
  WHERE staff_id IS NOT NULL AND deleted_at IS NULL;

-- Helper view: staff IDs currently linked to an active committee member
CREATE OR REPLACE VIEW public.committee_staff_ids AS
SELECT DISTINCT cm.staff_id
FROM public.committee_members cm
JOIN public.committees c ON c.id = cm.committee_id
WHERE cm.staff_id IS NOT NULL
  AND cm.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND cm.is_active = true
  AND c.is_active = true;

GRANT SELECT ON public.committee_staff_ids TO anon, authenticated;