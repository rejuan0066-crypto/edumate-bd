-- Audit log for category shift time changes
CREATE TABLE IF NOT EXISTS public.shift_time_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key TEXT NOT NULL,
  category_label TEXT,
  old_start TEXT,
  old_end TEXT,
  new_start TEXT,
  new_end TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  affected_staff_count INTEGER NOT NULL DEFAULT 0,
  affected_salary_records INTEGER NOT NULL DEFAULT 0,
  affected_staff_ids JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_audit_created ON public.shift_time_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_audit_category ON public.shift_time_audit_log(category_key);

ALTER TABLE public.shift_time_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shift audit log"
ON public.shift_time_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shift audit log"
ON public.shift_time_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));