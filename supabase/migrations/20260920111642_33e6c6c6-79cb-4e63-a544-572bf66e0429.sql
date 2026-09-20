DROP POLICY IF EXISTS "Admins and owners view resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can insert resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can update resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can delete resign letters" ON public.resign_letters;

CREATE POLICY "View resign letters by permission or owner"
ON public.resign_letters FOR SELECT TO authenticated
USING (
  public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'view')
  OR staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid())
);

CREATE POLICY "Insert resign letters by permission"
ON public.resign_letters FOR INSERT TO authenticated
WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'add'));

CREATE POLICY "Update resign letters by permission"
ON public.resign_letters FOR UPDATE TO authenticated
USING (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'edit'))
WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'edit'));

CREATE POLICY "Delete resign letters by permission"
ON public.resign_letters FOR DELETE TO authenticated
USING (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'delete'));