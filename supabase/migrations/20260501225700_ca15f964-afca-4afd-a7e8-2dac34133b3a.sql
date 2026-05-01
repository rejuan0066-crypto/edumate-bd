ALTER TABLE public.receipt_status_audit REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_status_audit;