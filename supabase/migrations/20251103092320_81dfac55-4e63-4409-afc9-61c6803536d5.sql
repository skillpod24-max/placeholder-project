-- Add metadata columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Add metadata columns to job_tasks table
ALTER TABLE public.job_tasks
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS daily_updates jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  team_head_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  role text,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, worker_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create team_tasks table for team heads to split work
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  job_task_id uuid REFERENCES public.job_tasks(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to_worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  deadline timestamp with time zone,
  daily_updates jsonb DEFAULT '[]'::jsonb,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Teams are viewable by company and vendor users"
ON public.teams FOR SELECT
USING (
  company_id IN (SELECT get_user_companies(auth.uid()))
  OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  OR team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

CREATE POLICY "Companies and vendors can insert teams"
ON public.teams FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'company'::app_role, company_id)
  OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

CREATE POLICY "Companies and vendors can update teams"
ON public.teams FOR UPDATE
USING (
  has_role(auth.uid(), 'company'::app_role, company_id)
  OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

CREATE POLICY "Companies and vendors can delete teams"
ON public.teams FOR DELETE
USING (
  has_role(auth.uid(), 'company'::app_role, company_id)
  OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- RLS Policies for team_members
CREATE POLICY "Team members are viewable by team users"
ON public.team_members FOR SELECT
USING (
  team_id IN (SELECT id FROM teams WHERE 
    company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
  OR worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

CREATE POLICY "Team admins can manage team members"
ON public.team_members FOR ALL
USING (
  team_id IN (SELECT id FROM teams WHERE 
    company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

-- RLS Policies for team_tasks
CREATE POLICY "Team tasks are viewable by team members"
ON public.team_tasks FOR SELECT
USING (
  team_id IN (SELECT id FROM teams WHERE 
    company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
  OR assigned_to_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

CREATE POLICY "Team heads can insert team tasks"
ON public.team_tasks FOR INSERT
WITH CHECK (
  team_id IN (SELECT id FROM teams WHERE 
    team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
    OR company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Team heads and assigned workers can update team tasks"
ON public.team_tasks FOR UPDATE
USING (
  team_id IN (SELECT id FROM teams WHERE 
    team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
    OR company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  )
  OR assigned_to_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

CREATE POLICY "Team heads can delete team tasks"
ON public.team_tasks FOR DELETE
USING (
  team_id IN (SELECT id FROM teams WHERE 
    team_head_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
    OR company_id IN (SELECT get_user_companies(auth.uid()))
    OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_tasks_updated_at
BEFORE UPDATE ON public.team_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();