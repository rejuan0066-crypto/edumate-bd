
-- Salary records table for monthly salary processing
CREATE TABLE public.salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric DEFAULT 0,
  overtime numeric DEFAULT 0,
  late_deduction numeric DEFAULT 0,
  absence_deduction numeric DEFAULT 0,
  advance_deduction numeric DEFAULT 0,
  other_deduction numeric DEFAULT 0,
  other_allowance numeric DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  working_days integer DEFAULT 0,
  present_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_days integer DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(staff_id, month_year)
);

-- Salary settings for configurable deduction/bonus rules
CREATE TABLE public.salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb DEFAULT '{}',
  description text,
  description_bn text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_records
CREATE POLICY "Admins can manage salary_records" ON public.salary_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own salary" ON public.salary_records
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- RLS policies for salary_settings
CREATE POLICY "Admins can manage salary_settings" ON public.salary_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view salary_settings" ON public.salary_settings
  FOR SELECT TO public
  USING (is_active = true);

-- Seed default salary settings
INSERT INTO public.salary_settings (setting_key, setting_value, description, description_bn) VALUES
  ('late_deduction_per_day', '{"amount": 50}', 'Deduction per late day', 'প্রতি বিলম্বের দিনে কর্তন'),
  ('absence_deduction_formula', '{"type": "per_day", "formula": "base_salary / working_days"}', 'Absence deduction formula', 'অনুপস্থিতি কর্তনের সূত্র'),
  ('bonus_rules', '{"eid_bonus": {"percentage": 100, "label": "ঈদ বোনাস"}, "annual_bonus": {"percentage": 50, "label": "বার্ষিক বোনাস"}}', 'Bonus rules', 'বোনাস নিয়মাবলী');
