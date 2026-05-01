-- Ensure donors.email exists with correct type, validation, and lookup index.
-- Idempotent: safe to run on databases where the column already exists.

-- 1) Add column if missing (no-op when present).
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS email text;

-- 2) Normalize existing data: trim + lowercase, blank → NULL.
UPDATE public.donors
   SET email = NULLIF(lower(btrim(email)), '')
 WHERE email IS NOT NULL
   AND email IS DISTINCT FROM NULLIF(lower(btrim(email)), '');

-- 3) Length cap (255) + basic RFC-lite format check; allow NULL (optional field).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'donors_email_format_chk'
       AND conrelid = 'public.donors'::regclass
  ) THEN
    ALTER TABLE public.donors
      ADD CONSTRAINT donors_email_format_chk
      CHECK (
        email IS NULL
        OR (
          char_length(email) <= 255
          AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
        )
      ) NOT VALID;
    -- Validate separately so existing bad rows surface as a clear error
    -- without aborting the column-add path.
    BEGIN
      ALTER TABLE public.donors VALIDATE CONSTRAINT donors_email_format_chk;
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'donors_email_format_chk has pre-existing violations; constraint left as NOT VALID. Clean data then run: ALTER TABLE public.donors VALIDATE CONSTRAINT donors_email_format_chk;';
    END;
  END IF;
END $$;

-- 4) Lookup index for case-insensitive search (donor matching, dedupe, admin search).
CREATE INDEX IF NOT EXISTS idx_donors_email_lower
  ON public.donors (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.donors.email IS
  'Optional donor email (lowercased, trimmed, ≤255 chars, RFC-lite format).';
