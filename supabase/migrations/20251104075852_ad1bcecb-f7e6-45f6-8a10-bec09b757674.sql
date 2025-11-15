-- Create vendor_companies junction table for multi-company vendor support
CREATE TABLE public.vendor_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vendor_id, company_id)
);

-- Enable RLS on vendor_companies
ALTER TABLE public.vendor_companies ENABLE ROW LEVEL SECURITY;

-- Vendors can view their company associations
CREATE POLICY "Vendors can view their companies"
ON public.vendor_companies
FOR SELECT
USING (vendor_id IN (
  SELECT id FROM public.vendors WHERE user_id = auth.uid()
));

-- Companies can view their vendor associations
CREATE POLICY "Companies can view their vendors"
ON public.vendor_companies
FOR SELECT
USING (company_id IN (
  SELECT get_user_companies(auth.uid())
));

-- Companies can manage vendor associations
CREATE POLICY "Companies can manage vendor associations"
ON public.vendor_companies
FOR ALL
USING (has_role(auth.uid(), 'company'::app_role, company_id));

-- Add assigned_to_team_id to jobs table
ALTER TABLE public.jobs
ADD COLUMN assigned_to_team_id UUID REFERENCES public.teams(id);

-- Add assigned_to_team_id to job_tasks table
ALTER TABLE public.job_tasks
ADD COLUMN assigned_to_team_id UUID REFERENCES public.teams(id);

-- Create activity logs table for real-time progress tracking
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'job', 'job_task', 'team_task'
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'status_change', 'progress_update', 'daily_log', 'comment'
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  progress_percentage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view activity logs for their company's jobs/tasks
CREATE POLICY "Users can view activity logs"
ON public.activity_logs
FOR SELECT
USING (
  entity_id IN (
    SELECT id FROM public.jobs WHERE company_id IN (SELECT get_user_companies(auth.uid()))
  ) OR
  entity_id IN (
    SELECT id FROM public.job_tasks WHERE job_id IN (
      SELECT id FROM public.jobs WHERE company_id IN (SELECT get_user_companies(auth.uid()))
    )
  ) OR
  entity_id IN (
    SELECT id FROM public.team_tasks WHERE team_id IN (
      SELECT id FROM public.teams WHERE company_id IN (SELECT get_user_companies(auth.uid()))
    )
  )
);

-- Users can insert activity logs for entities they have access to
CREATE POLICY "Users can create activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);