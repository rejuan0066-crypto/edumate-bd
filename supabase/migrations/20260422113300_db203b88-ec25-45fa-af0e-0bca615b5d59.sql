CREATE TABLE IF NOT EXISTS public.whatsapp_config (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone_number TEXT, welcome_message TEXT DEFAULT 'আসসালামু আলাইকুম', show_floating_button BOOLEAN NOT NULL DEFAULT true, button_position TEXT NOT NULL DEFAULT 'bottom-right', button_label TEXT DEFAULT 'WhatsApp চ্যাট', cloud_api_enabled BOOLEAN NOT NULL DEFAULT false, phone_number_id TEXT, business_account_id TEXT, default_language TEXT DEFAULT 'bn', business_hours TEXT, away_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view whatsapp config" ON public.whatsapp_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert whatsapp config" ON public.whatsapp_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update whatsapp config" ON public.whatsapp_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete whatsapp config" ON public.whatsapp_config FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_config (phone_number, welcome_message, show_floating_button) VALUES (NULL, 'আসসালামু আলাইকুম, আমি আপনাদের প্রতিষ্ঠান সম্পর্কে জানতে চাই।', true) ON CONFLICT DO NOTHING;