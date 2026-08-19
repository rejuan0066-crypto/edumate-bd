DELETE FROM exam_session_subjects WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_session_students WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_session_classes WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_sessions WHERE id='2b8df410-0c4b-45d5-95ff-1bc750710541';
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_unique_name_per_session ON public.exam_sessions (academic_session_id, exam_type, lower(name));