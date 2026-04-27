
-- Storage bucket for committee attachments (public read like other org assets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('committee-attachments', 'committee-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "committee_attachments_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'committee-attachments');

-- Authenticated upload / update / delete
CREATE POLICY "committee_attachments_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'committee-attachments');

CREATE POLICY "committee_attachments_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'committee-attachments');

CREATE POLICY "committee_attachments_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'committee-attachments');

-- Attachments tracking table
CREATE TABLE public.committee_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  description text,
  uploaded_by uuid,
  uploaded_by_email text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_committee_attachments_committee ON public.committee_attachments(committee_id) WHERE deleted_at IS NULL;

ALTER TABLE public.committee_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committee_attachments_select_all"
ON public.committee_attachments FOR SELECT
USING (deleted_at IS NULL);

CREATE POLICY "committee_attachments_auth_insert_row"
ON public.committee_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "committee_attachments_auth_update_row"
ON public.committee_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_committee_attachments_updated_at
BEFORE UPDATE ON public.committee_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
