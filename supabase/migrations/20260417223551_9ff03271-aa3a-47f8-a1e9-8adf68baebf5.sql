CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_session_id ON public.students(session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_type_id ON public.fee_payments(fee_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_at ON public.fee_payments(paid_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt_number ON public.fee_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON public.fee_payments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_year_month ON public.fee_payments(year, month) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_records_date_entity ON public.attendance_records(attendance_date DESC, entity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_entity_type ON public.attendance_records(entity_type, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_staff_category ON public.staff(staff_category);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON public.staff(staff_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_institution ON public.expenses(institution_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_month_year ON public.expenses(month_year) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_table ON public.system_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam ON public.results(exam_id);

CREATE INDEX IF NOT EXISTS idx_fee_types_class ON public.fee_types(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_types_session ON public.fee_types(session_id) WHERE deleted_at IS NULL;