
CREATE TABLE public.institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  other_info TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view institutions" ON public.institutions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage institutions" ON public.institutions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default institution
INSERT INTO public.institutions (name, name_en, address, phone, email, is_default)
VALUES ('আল-আরাবিয়া সুভানিয়া হাফিজিয়া মাদ্রাসা', 'Al-Arabia Subhania Hafizia Madrasah', 'খজান্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট', '01749842401', 'info@subhania.edu.bd', true);
