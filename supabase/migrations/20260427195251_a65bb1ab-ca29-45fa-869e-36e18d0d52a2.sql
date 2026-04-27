-- Enforce unique user name (full_name) on profiles, case-insensitive, ignoring blanks/nulls
CREATE UNIQUE INDEX IF NOT EXISTS profiles_full_name_unique_ci
  ON public.profiles (lower(full_name))
  WHERE full_name IS NOT NULL AND full_name <> '';