
CREATE OR REPLACE FUNCTION public.get_data_sensitivity_map()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  sensitivity TEXT,
  protection TEXT,
  notes TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin / super_admin can see this map
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) 
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    CASE
      -- AES-256 encrypted shadow columns
      WHEN c.column_name LIKE '%_encrypted' THEN 'encrypted_aes256'
      -- The plaintext salary kept for sort/search but mirrored to encrypted column
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'encrypted_mirror'
      -- Identity / contact data — RLS + disk-level only (per policy)
      WHEN c.column_name IN (
        'nid','birth_registration','birth_registration_no','birth_certificate',
        'phone','mobile','mobile_number','phone_number','contact_number',
        'father_nid','mother_nid','guardian_nid','spouse_nid',
        'father_phone','mother_phone','guardian_phone',
        'address','present_address','permanent_address','postal_address',
        'email','personal_email','father_email','mother_email','guardian_email',
        'date_of_birth','dob','blood_group','religion'
      ) THEN 'sensitive_rls_only'
      -- Financial fields (non-encrypted) 
      WHEN c.column_name IN (
        'amount','paid_amount','due_amount','total_amount','discount','fine',
        'allowance','bonus','deduction','tax','provident_fund'
      ) THEN 'sensitive_rls_only'
      ELSE 'non_sensitive'
    END AS sensitivity,
    CASE
      WHEN c.column_name LIKE '%_encrypted' 
        THEN 'AES-256 (pgcrypto pgp_sym_encrypt)'
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'Mirrored to *_encrypted (AES-256)'
      WHEN c.column_name IN (
        'nid','birth_registration','birth_registration_no','phone','mobile','mobile_number',
        'father_nid','mother_nid','guardian_nid','address','present_address','permanent_address',
        'email','date_of_birth','blood_group','religion','amount','paid_amount','due_amount',
        'total_amount','discount','fine','allowance','bonus','deduction'
      ) THEN 'RLS + Disk-level AES-256'
      ELSE 'RLS only'
    END AS protection,
    CASE
      WHEN c.column_name LIKE '%_encrypted' 
        THEN 'Ciphertext column. Decrypt via decrypt_value()/decrypt_numeric().'
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'Plaintext kept for sort/filter; ciphertext is source of truth.'
      WHEN c.column_name IN ('nid','father_nid','mother_nid','guardian_nid','spouse_nid','birth_registration','birth_registration_no')
        THEN 'NID/BRN — needed for cross-referencing; not column-encrypted by policy.'
      WHEN c.column_name IN ('phone','mobile','mobile_number','father_phone','mother_phone','guardian_phone')
        THEN 'Phone — used for OTP/SMS lookup; RLS-protected.'
      ELSE NULL
    END AS notes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name NOT IN (
      'system_logs','rate_limit_log','encryption_keys','backup_history',
      'otp_codes','committee_audit_log'
    )
  ORDER BY 
    CASE 
      WHEN c.column_name LIKE '%_encrypted' THEN 1
      WHEN c.column_name IN ('salary','net_salary','base_salary') THEN 2
      WHEN c.column_name IN ('nid','birth_registration','phone','mobile','email','address','present_address','permanent_address') THEN 3
      ELSE 4
    END,
    c.table_name, c.column_name;
END;
$$;

-- Add a row representing the auth.users password hash so admins see it
CREATE OR REPLACE FUNCTION public.get_password_protection_info()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'table', 'auth.users',
    'column', 'encrypted_password',
    'algorithm', 'scrypt (BCrypt-equivalent, managed by Supabase Auth)',
    'user_count', (SELECT COUNT(*) FROM auth.users),
    'never_logged', true
  );
$$;
