
CREATE TABLE public.donors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  donation_amount NUMERIC DEFAULT 0,
  donation_date DATE DEFAULT CURRENT_DATE,
  donation_type TEXT DEFAULT 'one-time',
  purpose TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage donors" ON public.donors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view donors" ON public.donors FOR SELECT TO public USING (true);
