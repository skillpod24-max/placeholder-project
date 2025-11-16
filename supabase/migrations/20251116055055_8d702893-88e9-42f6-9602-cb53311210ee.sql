-- Helper function to avoid RLS recursion when checking company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.company_id = _company_id
      AND ur.user_id = _user_id
      AND ur.role = 'company'::public.app_role
  );
$$;

-- Replace recursive policy on user_roles
DROP POLICY IF EXISTS "Company admins can manage roles" ON public.user_roles;

CREATE POLICY "Company admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_company_admin(company_id, auth.uid()))
WITH CHECK (public.is_company_admin(company_id, auth.uid()));