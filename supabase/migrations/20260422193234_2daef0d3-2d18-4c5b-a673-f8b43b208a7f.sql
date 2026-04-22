-- Health Profiles
CREATE TABLE public.health_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  blood_group TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  family_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT health_profile_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE UNIQUE INDEX health_profiles_student_uniq ON public.health_profiles(student_id) WHERE student_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX health_profiles_staff_uniq ON public.health_profiles(staff_id) WHERE staff_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage health profiles" ON public.health_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER health_profiles_updated_at
  BEFORE UPDATE ON public.health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medical Visits
CREATE TABLE public.medical_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  attended_by TEXT,
  temperature_c NUMERIC,
  blood_pressure TEXT,
  pulse_rate INTEGER,
  follow_up_date DATE,
  severity TEXT DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe','emergency')),
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_visit_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX medical_visits_student_idx ON public.medical_visits(student_id) WHERE deleted_at IS NULL;
CREATE INDEX medical_visits_staff_idx ON public.medical_visits(staff_id) WHERE deleted_at IS NULL;
CREATE INDEX medical_visits_date_idx ON public.medical_visits(visit_date DESC);

ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage medical visits" ON public.medical_visits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER medical_visits_updated_at
  BEFORE UPDATE ON public.medical_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vaccinations
CREATE TABLE public.vaccinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  vaccine_name_bn TEXT,
  dose_number INTEGER DEFAULT 1,
  vaccination_date DATE NOT NULL,
  next_due_date DATE,
  administered_by TEXT,
  batch_number TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vaccination_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX vaccinations_student_idx ON public.vaccinations(student_id) WHERE deleted_at IS NULL;
CREATE INDEX vaccinations_staff_idx ON public.vaccinations(staff_id) WHERE deleted_at IS NULL;

ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vaccinations" ON public.vaccinations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vaccinations_updated_at
  BEFORE UPDATE ON public.vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();