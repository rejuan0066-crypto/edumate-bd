DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Super admins: full control over all roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admins: can manage non-super_admin roles only, and cannot touch super_admin rows
CREATE POLICY "Admins can manage non-super-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin'::app_role)
WITH CHECK (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin'::app_role);