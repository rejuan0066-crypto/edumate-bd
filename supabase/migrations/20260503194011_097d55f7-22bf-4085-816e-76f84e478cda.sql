ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS leave_type TEXT,
  ADD COLUMN IF NOT EXISTS leave_reason TEXT;