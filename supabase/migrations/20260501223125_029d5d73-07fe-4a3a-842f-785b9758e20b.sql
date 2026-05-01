ALTER TABLE public.parent_payment_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_payment_requests;