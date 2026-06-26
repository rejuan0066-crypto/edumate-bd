ALTER TABLE public.hostel_meal_attendance ALTER COLUMN breakfast DROP NOT NULL, ALTER COLUMN breakfast DROP DEFAULT;
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN lunch DROP NOT NULL, ALTER COLUMN lunch DROP DEFAULT;
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN dinner DROP NOT NULL, ALTER COLUMN dinner DROP DEFAULT;