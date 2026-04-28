-- 1) Add payroll/attendance visibility flags on staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS include_in_payroll BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in_attendance BOOLEAN NOT NULL DEFAULT true;

-- 2) Insert two new staff categories: Director & Committee Member
INSERT INTO public.staff_categories (key, name, name_bn, id_prefix, id_start_range, sort_order, is_active, color, description)
VALUES
  ('director', 'Director', 'পরিচালক', 'DIR', 5001, 5, true, '#7c3aed', 'পরিচালনা পর্ষদ / প্রশাসনিক বিভাগের সদস্য'),
  ('committee_member', 'Committee Member', 'কমিটি সদস্য', 'CMT', 6001, 6, true, '#0ea5e9', 'বিভিন্ন কমিটির সদস্য')
ON CONFLICT (key) DO NOTHING;

-- 3) Link a staff record to an optional custom role
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- 4) Seed common board / committee custom roles (skip if name already exists)
INSERT INTO public.custom_roles (name, name_bn, base_role, is_system, is_active, sort_order, description, description_bn)
SELECT * FROM (VALUES
  ('director', 'পরিচালক', 'admin', true, true, 10, 'Member of the board of directors', 'পরিচালনা পর্ষদের সদস্য'),
  ('chairman', 'সভাপতি', 'admin', true, true, 20, 'Chairman of the board', 'বোর্ডের সভাপতি'),
  ('vice_chairman', 'সহ-সভাপতি', 'admin', true, true, 30, 'Vice Chairman', 'সহ-সভাপতি'),
  ('secretary', 'সম্পাদক', 'administrative', true, true, 40, 'Secretary', 'সম্পাদক'),
  ('committee_member', 'কমিটি সদস্য', 'staff', true, true, 50, 'General committee member', 'সাধারণ কমিটি সদস্য')
) AS v(name, name_bn, base_role, is_system, is_active, sort_order, description, description_bn)
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.name = v.name);