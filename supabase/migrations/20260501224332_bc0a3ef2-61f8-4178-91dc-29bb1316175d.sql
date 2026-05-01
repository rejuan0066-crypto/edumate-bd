
-- Receipt verification tokens table (works for any receipt type)
CREATE TABLE public.receipt_verify_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  receipt_type text NOT NULL CHECK (receipt_type IN ('fee_payment', 'parent_payment_request', 'donation', 'salary')),
  receipt_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 years'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz
);

CREATE INDEX idx_receipt_verify_tokens_token ON public.receipt_verify_tokens(token);
CREATE INDEX idx_receipt_verify_tokens_receipt ON public.receipt_verify_tokens(receipt_type, receipt_id);

ALTER TABLE public.receipt_verify_tokens ENABLE ROW LEVEL SECURITY;

-- Admins/staff manage; everyone else uses RPC
CREATE POLICY "Admins manage receipt tokens"
ON public.receipt_verify_tokens
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
);

-- Helper to create or fetch a token for a receipt (idempotent)
CREATE OR REPLACE FUNCTION public.get_or_create_receipt_token(
  _receipt_type text,
  _receipt_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
BEGIN
  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  SELECT token INTO _token
  FROM public.receipt_verify_tokens
  WHERE receipt_type = _receipt_type
    AND receipt_id = _receipt_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF _token IS NOT NULL THEN
    RETURN _token;
  END IF;

  _token := encode(gen_random_bytes(24), 'base64');
  -- URL-safe
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id)
  VALUES (_token, _receipt_type, _receipt_id);

  RETURN _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_receipt_token(text, uuid) TO authenticated, anon;

-- Public verify RPC: returns minimal info (status, amount, student/payer name, date, verified badge)
CREATE OR REPLACE FUNCTION public.verify_receipt_public(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.receipt_verify_tokens%ROWTYPE;
  _result jsonb;
  _student_uuid uuid;
BEGIN
  SELECT * INTO _row FROM public.receipt_verify_tokens WHERE token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_FOUND');
  END IF;

  IF _row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'REVOKED');
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'EXPIRED');
  END IF;

  -- Update scan stats
  UPDATE public.receipt_verify_tokens
  SET scan_count = scan_count + 1, last_scanned_at = now()
  WHERE id = _row.id;

  IF _row.receipt_type = 'fee_payment' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'fee_payment',
      'receipt_id', fp.id,
      'receipt_number', fp.receipt_number,
      'amount', fp.paid_amount,
      'status', fp.status,
      'paid_at', fp.paid_at,
      'student_name', s.name,
      'student_id', s.student_id,
      'class_name', c.name,
      'fee_type', ft.name
    ) INTO _result
    FROM public.fee_payments fp
    LEFT JOIN public.students s ON s.id = fp.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
    WHERE fp.id = _row.receipt_id;

  ELSIF _row.receipt_type = 'parent_payment_request' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'parent_payment_request',
      'receipt_id', ppr.id,
      'amount', ppr.amount,
      'status', ppr.status,
      'method', ppr.method,
      'trx_id', ppr.trx_id,
      'paid_at', COALESCE(ppr.verified_at, ppr.created_at),
      'student_name', s.name,
      'student_id', s.student_id,
      'class_name', c.name
    ) INTO _result
    FROM public.parent_payment_requests ppr
    LEFT JOIN public.students s ON s.id = ppr.student_uuid
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE ppr.id = _row.receipt_id;
  END IF;

  IF _result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'RECEIPT_DELETED');
  END IF;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_receipt_public(text) TO authenticated, anon;

-- Admin full-detail RPC
CREATE OR REPLACE FUNCTION public.verify_receipt_admin(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.receipt_verify_tokens%ROWTYPE;
  _result jsonb;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  ) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT * INTO _row FROM public.receipt_verify_tokens WHERE token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_FOUND');
  END IF;

  IF _row.receipt_type = 'fee_payment' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'fee_payment',
      'receipt', to_jsonb(fp.*),
      'student', to_jsonb(s.*),
      'class', to_jsonb(c.*),
      'fee_type', to_jsonb(ft.*),
      'token_info', jsonb_build_object(
        'created_at', _row.created_at,
        'expires_at', _row.expires_at,
        'revoked_at', _row.revoked_at,
        'scan_count', _row.scan_count + 1,
        'last_scanned_at', now()
      )
    ) INTO _result
    FROM public.fee_payments fp
    LEFT JOIN public.students s ON s.id = fp.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
    WHERE fp.id = _row.receipt_id;

  ELSIF _row.receipt_type = 'parent_payment_request' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'parent_payment_request',
      'receipt', to_jsonb(ppr.*),
      'student', to_jsonb(s.*),
      'class', to_jsonb(c.*),
      'token_info', jsonb_build_object(
        'created_at', _row.created_at,
        'expires_at', _row.expires_at,
        'revoked_at', _row.revoked_at,
        'scan_count', _row.scan_count + 1,
        'last_scanned_at', now()
      )
    ) INTO _result
    FROM public.parent_payment_requests ppr
    LEFT JOIN public.students s ON s.id = ppr.student_uuid
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE ppr.id = _row.receipt_id;
  END IF;

  -- Update scan stats
  UPDATE public.receipt_verify_tokens
  SET scan_count = scan_count + 1, last_scanned_at = now()
  WHERE id = _row.id;

  RETURN COALESCE(_result, jsonb_build_object('valid', false, 'error', 'RECEIPT_DELETED'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_receipt_admin(text) TO authenticated;
