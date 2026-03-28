
-- Attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entity_type TEXT NOT NULL DEFAULT 'student', -- student, staff, teacher
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, half_day, leave
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attendance_date, entity_type, entity_id)
);

-- Attendance rules table (admin-configurable)
CREATE TABLE public.attendance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'student',
  rule_type TEXT NOT NULL DEFAULT 'status', -- status, time, penalty
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_records
CREATE POLICY "Admins can manage attendance_records" ON public.attendance_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view attendance_records" ON public.attendance_records FOR SELECT TO public USING (true);

-- RLS policies for attendance_rules
CREATE POLICY "Admins can manage attendance_rules" ON public.attendance_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active attendance_rules" ON public.attendance_rules FOR SELECT TO public USING (is_active = true);

-- Seed default attendance rules
INSERT INTO public.attendance_rules (name, name_bn, entity_type, rule_type, config, sort_order) VALUES
('Present', 'উপস্থিত', 'student', 'status', '{"color": "green", "icon": "check", "counts_as": "present"}', 1),
('Absent', 'অনুপস্থিত', 'student', 'status', '{"color": "red", "icon": "x", "counts_as": "absent"}', 2),
('Late', 'বিলম্ব', 'student', 'status', '{"color": "yellow", "icon": "clock", "counts_as": "late"}', 3),
('Half Day', 'অর্ধদিন', 'student', 'status', '{"color": "orange", "icon": "half", "counts_as": "half_day"}', 4),
('Leave', 'ছুটি', 'student', 'status', '{"color": "blue", "icon": "calendar", "counts_as": "leave"}', 5),
('Present', 'উপস্থিত', 'staff', 'status', '{"color": "green", "icon": "check", "counts_as": "present"}', 1),
('Absent', 'অনুপস্থিত', 'staff', 'status', '{"color": "red", "icon": "x", "counts_as": "absent"}', 2),
('Late', 'বিলম্ব', 'staff', 'status', '{"color": "yellow", "icon": "clock", "counts_as": "late"}', 3),
('Half Day', 'অর্ধদিন', 'staff', 'status', '{"color": "orange", "icon": "half", "counts_as": "half_day"}', 4),
('Leave', 'ছুটি', 'staff', 'status', '{"color": "blue", "icon": "calendar", "counts_as": "leave"}', 5);
