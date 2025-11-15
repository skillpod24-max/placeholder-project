-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('company', 'vendor', 'worker');

-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('created', 'assigned', 'in_progress', 'completed');

-- Companies table (tenants)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- User roles table (avoiding recursion)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND company_id = _company_id
  )
$$;

-- Function to get user companies
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT company_id
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Workers table
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.job_status NOT NULL DEFAULT 'created',
  assigned_to_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  assigned_to_worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Job activities table (audit log)
CREATE TABLE public.job_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_status public.job_status,
  new_status public.job_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Companies are viewable by their users"
  ON public.companies FOR SELECT
  USING (id IN (SELECT public.get_user_companies(auth.uid())));

CREATE POLICY "Only system can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (false);

-- RLS Policies for user_roles
CREATE POLICY "User roles are viewable by the user"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for vendors
CREATE POLICY "Vendors are viewable by company users"
  ON public.vendors FOR SELECT
  USING (company_id IN (SELECT public.get_user_companies(auth.uid())));

CREATE POLICY "Companies can insert vendors"
  ON public.vendors FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company', company_id));

CREATE POLICY "Companies can update vendors"
  ON public.vendors FOR UPDATE
  USING (public.has_role(auth.uid(), 'company', company_id));

CREATE POLICY "Companies can delete vendors"
  ON public.vendors FOR DELETE
  USING (public.has_role(auth.uid(), 'company', company_id));

-- RLS Policies for workers
CREATE POLICY "Workers are viewable by company and vendor users"
  ON public.workers FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_companies(auth.uid())) OR
    user_id = auth.uid()
  );

CREATE POLICY "Companies and vendors can insert workers"
  ON public.workers FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'company', company_id) OR
    (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  );

CREATE POLICY "Companies and vendors can update workers"
  ON public.workers FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'company', company_id) OR
    (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  );

-- RLS Policies for jobs
CREATE POLICY "Jobs are viewable by company users"
  ON public.jobs FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_companies(auth.uid())) OR
    assigned_to_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  );

CREATE POLICY "Companies can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company', company_id));

CREATE POLICY "Companies, vendors, and assigned workers can update jobs"
  ON public.jobs FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'company', company_id) OR
    assigned_to_vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()) OR
    assigned_to_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  );

-- RLS Policies for job_activities
CREATE POLICY "Job activities are viewable by company users"
  ON public.job_activities FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE company_id IN (SELECT public.get_user_companies(auth.uid()))
    )
  );

CREATE POLICY "Authenticated users can insert job activities"
  ON public.job_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Enable realtime for job_activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_activities;
ALTER TABLE public.job_activities REPLICA IDENTITY FULL;