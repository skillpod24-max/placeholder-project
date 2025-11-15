-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.job_activities CASCADE;
DROP TABLE IF EXISTS public.team_tasks CASCADE;
DROP TABLE IF EXISTS public.job_tasks CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_workers CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.workers CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.vendor_companies CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP TYPE IF EXISTS public.job_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create enums
CREATE TYPE public.job_status AS ENUM ('draft', 'created', 'pending', 'assigned', 'in_progress', 'completed', 'on_hold', 'cancelled');
CREATE TYPE public.app_role AS ENUM ('company', 'vendor', 'worker');

-- Companies table
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_company_id_role_key UNIQUE (user_id, company_id, role),
  CONSTRAINT user_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Vendors table
CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_user_id_company_id_key UNIQUE (user_id, company_id),
  CONSTRAINT vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workers table
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  vendor_id uuid NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  role text NULL,
  team_role text NULL,
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_user_id_company_id_key UNIQUE (user_id, company_id),
  CONSTRAINT workers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT workers_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL
);

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Teams table
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL,
  vendor_id uuid NULL,
  team_head_id uuid NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT teams_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT teams_team_head_id_fkey FOREIGN KEY (team_head_id) REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team members table (not team_workers!)
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  role text NULL,
  added_by uuid NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_worker_id_key UNIQUE (team_id, worker_id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_members_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE
);

-- Jobs table with title field
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  status public.job_status NOT NULL DEFAULT 'created',
  assigned_to_vendor_id uuid NULL,
  assigned_to_worker_id uuid NULL,
  assigned_to_team_id uuid NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  requirements text NULL,
  deadline timestamp with time zone NULL,
  assigned_by uuid NULL,
  assigned_at timestamp with time zone NULL,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT jobs_assigned_to_vendor_id_fkey FOREIGN KEY (assigned_to_vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL,
  CONSTRAINT jobs_assigned_to_worker_id_fkey FOREIGN KEY (assigned_to_worker_id) REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT jobs_assigned_to_team_id_fkey FOREIGN KEY (assigned_to_team_id) REFERENCES public.teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_jobs_deadline ON public.jobs(deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Job tasks table
CREATE TABLE public.job_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  assigned_to_worker_id uuid NULL,
  assigned_to_team_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  deadline timestamp with time zone NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid NULL,
  assigned_at timestamp with time zone NULL,
  daily_updates jsonb NULL DEFAULT '[]'::jsonb,
  progress_percentage integer NULL DEFAULT 0,
  CONSTRAINT job_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT job_tasks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT job_tasks_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT job_tasks_assigned_to_worker_id_fkey FOREIGN KEY (assigned_to_worker_id) REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT job_tasks_assigned_to_team_id_fkey FOREIGN KEY (assigned_to_team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT job_tasks_progress_percentage_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX idx_job_tasks_deadline ON public.job_tasks(deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER update_job_tasks_updated_at BEFORE UPDATE ON public.job_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team tasks table
CREATE TABLE public.team_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  job_task_id uuid NULL,
  job_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  assigned_to_worker_id uuid NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  deadline timestamp with time zone NULL,
  daily_updates jsonb NULL DEFAULT '[]'::jsonb,
  progress_percentage integer NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT team_tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_tasks_job_task_id_fkey FOREIGN KEY (job_task_id) REFERENCES public.job_tasks(id) ON DELETE CASCADE,
  CONSTRAINT team_tasks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT team_tasks_assigned_to_worker_id_fkey FOREIGN KEY (assigned_to_worker_id) REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT team_tasks_progress_percentage_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX idx_team_tasks_deadline ON public.team_tasks(deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER update_team_tasks_updated_at BEFORE UPDATE ON public.team_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  company_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  job_id uuid NULL,
  amount numeric(12, 2) NOT NULL,
  tax numeric(12, 2) NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone NULL,
  paid_date timestamp with time zone NULL,
  notes text NULL,
  items jsonb NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number),
  CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT invoices_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  CONSTRAINT invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE
);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Job activities table
CREATE TABLE public.job_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  old_status public.job_status NULL,
  new_status public.job_status NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_activities_pkey PRIMARY KEY (id),
  CONSTRAINT job_activities_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  old_value text NULL,
  new_value text NULL,
  notes text NULL,
  progress_percentage integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  notification_type text NULL,
  is_read boolean NULL DEFAULT false,
  recipient_id uuid NULL,
  deadline_notified boolean NULL DEFAULT false,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_activity_logs_recipient ON public.activity_logs(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Vendor companies junction table
CREATE TABLE public.vendor_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  company_id uuid NOT NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT vendor_companies_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_companies_vendor_id_company_id_key UNIQUE (vendor_id, company_id),
  CONSTRAINT vendor_companies_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT vendor_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view their companies"
ON public.companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = companies.id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Company admins can update companies"
ON public.companies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = companies.id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage roles"
ON public.user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.company_id = user_roles.company_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'company'
  )
);

-- RLS Policies for vendors
CREATE POLICY "Users can view vendors in their companies"
ON public.vendors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = vendors.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors and company admins can update vendors"
ON public.vendors FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = vendors.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

CREATE POLICY "Company admins can create vendors"
ON public.vendors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = vendors.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

-- RLS Policies for workers
CREATE POLICY "Users can view workers in their companies"
ON public.workers FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = workers.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their data"
ON public.workers FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Company and vendor admins can create workers"
ON public.workers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = workers.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role IN ('company', 'vendor')
  )
);

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their companies"
ON public.teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = teams.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can manage their teams"
ON public.teams FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = teams.vendor_id
    AND vendors.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = teams.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their companies"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.user_roles ur ON ur.company_id = t.company_id
    WHERE t.id = team_members.team_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can manage their team members"
ON public.team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.vendors v ON v.id = t.vendor_id
    WHERE t.id = team_members.team_id
    AND v.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.user_roles ur ON ur.company_id = t.company_id
    WHERE t.id = team_members.team_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'company'
  )
);

-- RLS Policies for jobs
CREATE POLICY "Users can view jobs in their companies"
ON public.jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = jobs.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage jobs"
ON public.jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = jobs.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

CREATE POLICY "Assigned vendors and workers can update jobs"
ON public.jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = jobs.assigned_to_vendor_id
    AND vendors.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = jobs.assigned_to_worker_id
    AND workers.user_id = auth.uid()
  )
);

-- RLS Policies for job_tasks
CREATE POLICY "Users can view job tasks in their companies"
ON public.job_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = job_tasks.job_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can manage their job tasks"
ON public.job_tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = job_tasks.vendor_id
    AND vendors.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned workers can update their job tasks"
ON public.job_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = job_tasks.assigned_to_worker_id
    AND workers.user_id = auth.uid()
  )
);

-- RLS Policies for team_tasks
CREATE POLICY "Users can view team tasks in their companies"
ON public.team_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.user_roles ur ON ur.company_id = t.company_id
    WHERE t.id = team_tasks.team_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update their tasks"
ON public.team_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.workers w ON w.id = tm.worker_id
    WHERE tm.team_id = team_tasks.team_id
    AND w.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = team_tasks.assigned_to_worker_id
    AND workers.user_id = auth.uid()
  )
);

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their companies"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = invoices.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Company and vendor admins can manage invoices"
ON public.invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = invoices.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  ) OR
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = invoices.vendor_id
    AND vendors.user_id = auth.uid()
  )
);

-- RLS Policies for job_activities
CREATE POLICY "Users can view job activities in their companies"
ON public.job_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = job_activities.job_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create job activities"
ON public.job_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their activity logs"
ON public.activity_logs FOR SELECT
USING (
  user_id = auth.uid() OR recipient_id = auth.uid()
);

CREATE POLICY "Authenticated users can create activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their activity logs"
ON public.activity_logs FOR UPDATE
USING (recipient_id = auth.uid());

-- RLS Policies for vendor_companies
CREATE POLICY "Users can view vendor companies"
ON public.vendor_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = vendor_companies.company_id
    AND user_roles.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = vendor_companies.vendor_id
    AND vendors.user_id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage vendor companies"
ON public.vendor_companies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.company_id = vendor_companies.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);