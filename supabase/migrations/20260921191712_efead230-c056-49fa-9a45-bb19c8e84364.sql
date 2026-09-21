CREATE INDEX IF NOT EXISTS idx_attendance_records_type_shift_date ON public.attendance_records (entity_type, shift, attendance_date);
CREATE INDEX IF NOT EXISTS idx_results_exam_updated_at ON public.results (exam_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_actions_status ON public.pending_actions (status) WHERE status = 'pending';