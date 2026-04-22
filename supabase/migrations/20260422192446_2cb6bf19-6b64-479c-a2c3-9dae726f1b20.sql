
-- Add session/class/staff/fee-mode fields to hostel_allocations
ALTER TABLE public.hostel_allocations
  ADD COLUMN IF NOT EXISTS occupant_type TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_mode TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Make student_id nullable since staff allocations won't have it
ALTER TABLE public.hostel_allocations ALTER COLUMN student_id DROP NOT NULL;

-- Validation: fee_mode must be one of free/full/discount; occupant_type student/staff
ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_fee_mode_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_fee_mode_chk
  CHECK (fee_mode IN ('free','full','discount'));

ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_occupant_type_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_occupant_type_chk
  CHECK (occupant_type IN ('student','staff'));

-- Ensure either student_id or staff_id is set based on occupant_type
ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_occupant_ref_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_occupant_ref_chk
  CHECK (
    (occupant_type = 'student' AND student_id IS NOT NULL) OR
    (occupant_type = 'staff' AND staff_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_hostel_alloc_session ON public.hostel_allocations(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_class ON public.hostel_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_staff ON public.hostel_allocations(staff_id);
