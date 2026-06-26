-- Allow meal attendance without an allocation
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN allocation_id DROP NOT NULL;

ALTER TABLE public.hostel_meal_attendance
  ADD COLUMN IF NOT EXISTS person_type text,
  ADD COLUMN IF NOT EXISTS person_id uuid,
  ADD COLUMN IF NOT EXISTS person_name text;

-- Unique index for ad-hoc (non-allocation) members per date
CREATE UNIQUE INDEX IF NOT EXISTS hostel_meal_attendance_person_date_key
  ON public.hostel_meal_attendance (person_type, person_id, attendance_date)
  WHERE allocation_id IS NULL;