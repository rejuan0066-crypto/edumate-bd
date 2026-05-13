
-- Zakat & Fitra yearly settings
CREATE TABLE public.zakat_fitra_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  -- Nisab thresholds (in grams)
  nisab_gold_grams numeric NOT NULL DEFAULT 87.48,
  nisab_silver_grams numeric NOT NULL DEFAULT 612.36,
  -- Per-gram prices in BDT
  gold_price_per_gram numeric NOT NULL DEFAULT 0,
  silver_price_per_gram numeric NOT NULL DEFAULT 0,
  -- Zakat rate (percent)
  zakat_rate numeric NOT NULL DEFAULT 2.5,
  -- Fitra options: array of {name_bn, name_en, amount_kg, price_per_kg}
  fitra_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Display
  notes_bn text DEFAULT '',
  notes_en text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zakat_fitra_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zakat settings"
  ON public.zakat_fitra_settings FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage zakat settings"
  ON public.zakat_fitra_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER zakat_fitra_settings_updated
  BEFORE UPDATE ON public.zakat_fitra_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed current year row
INSERT INTO public.zakat_fitra_settings (year, gold_price_per_gram, silver_price_per_gram, fitra_options)
VALUES (
  EXTRACT(YEAR FROM now())::int,
  12000,
  150,
  '[
    {"name_bn":"গম/আটা","name_en":"Wheat/Flour","amount_kg":1.65,"price_per_kg":70},
    {"name_bn":"যব","name_en":"Barley","amount_kg":3.30,"price_per_kg":120},
    {"name_bn":"খেজুর","name_en":"Dates","amount_kg":3.30,"price_per_kg":600},
    {"name_bn":"কিশমিশ","name_en":"Raisins","amount_kg":3.30,"price_per_kg":850},
    {"name_bn":"পনির","name_en":"Cheese","amount_kg":3.30,"price_per_kg":900}
  ]'::jsonb
);
