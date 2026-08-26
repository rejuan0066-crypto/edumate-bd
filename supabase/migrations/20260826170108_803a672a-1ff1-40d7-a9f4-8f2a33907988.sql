REVOKE ALL ON FUNCTION public.reset_result_publish_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_exam_session_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_result_publish_for_approval(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_result_publish(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_result_publish(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_result_publish_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_result_publish(uuid, text) TO authenticated;