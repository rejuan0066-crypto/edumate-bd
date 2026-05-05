
-- Fix Security Definer Views: switch to security_invoker so RLS of querying user applies
ALTER VIEW public.online_exam_questions_public SET (security_invoker = on);
ALTER VIEW public.admission_test_questions_public SET (security_invoker = on);

-- Fix mutable search_path on public functions
ALTER FUNCTION public.is_valid_result_signatories(jsonb) SET search_path = public;
ALTER FUNCTION public.warn_function_overloads() SET search_path = public;
