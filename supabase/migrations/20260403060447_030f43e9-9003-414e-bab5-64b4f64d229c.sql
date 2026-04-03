
-- Update Rejuan H's role to super_admin
UPDATE public.user_roles SET role = 'super_admin' WHERE user_id = 'f712d344-a0db-4c57-bee4-80db1694fd74';

-- Update has_role function to treat super_admin as having admin privileges too
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND (
      role = _role 
      OR (role = 'super_admin' AND _role = 'admin')
    )
  )
$$;
