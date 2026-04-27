-- Committees table
CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  formation_date DATE,
  tenure_months INTEGER,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Committee members table
CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  designation TEXT NOT NULL,
  designation_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  occupation_en TEXT,
  photo_url TEXT,
  joining_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON public.committee_members(committee_id);

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

-- Public read (active only via app filter)
CREATE POLICY "Public can view committees"
  ON public.committees FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Public can view committee members"
  ON public.committee_members FOR SELECT USING (deleted_at IS NULL);

-- Admin write
CREATE POLICY "Admins can manage committees"
  ON public.committees FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage committee members"
  ON public.committee_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_committees_updated_at BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_committee_members_updated_at BEFORE UPDATE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();