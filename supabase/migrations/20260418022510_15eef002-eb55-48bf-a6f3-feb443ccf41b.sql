-- Create a settings table for default meeting provider configurations
CREATE TABLE IF NOT EXISTS public.meeting_provider_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    default_room_url TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_provider_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view meeting provider settings"
    ON public.meeting_provider_settings FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage meeting provider settings"
    ON public.meeting_provider_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_meeting_provider_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_meeting_provider_settings_updated_at ON public.meeting_provider_settings;
CREATE TRIGGER update_meeting_provider_settings_updated_at
    BEFORE UPDATE ON public.meeting_provider_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_meeting_provider_settings_updated_at();

-- Insert default Daily.co settings with the user's room
INSERT INTO public.meeting_provider_settings (provider, default_room_url, is_enabled)
VALUES ('daily', 'https://subhaniamadrasa.daily.co/Ljfzke0kWkZ9bQ6N49ZS', true)
ON CONFLICT (provider) DO UPDATE 
SET default_room_url = EXCLUDED.default_room_url, 
    is_enabled = true,
    updated_at = now();