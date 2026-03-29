
-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  content text,
  content_bn text,
  category text NOT NULL DEFAULT 'general',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage posts" ON public.posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published posts" ON public.posts
  FOR SELECT TO public
  USING (is_published = true);

-- Create storage bucket for post attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('post-attachments', 'post-attachments', true);

-- Storage policies
CREATE POLICY "Admins can upload post attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-attachments' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete post attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-attachments' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Anyone can view post attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'post-attachments');
