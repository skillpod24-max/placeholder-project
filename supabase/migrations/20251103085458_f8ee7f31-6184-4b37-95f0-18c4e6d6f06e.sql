-- Add more fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS requirements text,
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone;

-- Create job_tasks table for vendor task breakdown
CREATE TABLE IF NOT EXISTS public.job_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  assigned_to_worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  deadline timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on job_tasks
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_tasks
CREATE POLICY "Vendors can view their job tasks"
ON public.job_tasks FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR assigned_to_worker_id IN (
    SELECT id FROM public.workers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can insert job tasks"
ON public.job_tasks FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update their job tasks"
ON public.job_tasks FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
  OR assigned_to_worker_id IN (
    SELECT id FROM public.workers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Vendors can delete their job tasks"
ON public.job_tasks FOR DELETE
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
);

-- Add trigger for job_tasks updated_at
CREATE TRIGGER update_job_tasks_updated_at
BEFORE UPDATE ON public.job_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix workers table - ensure proper isolation
-- Company workers should have NULL vendor_id
-- Vendor workers must have vendor_id set
-- This is already in the schema, just need to fix queries

-- Update RLS policy for workers to show only relevant workers
DROP POLICY IF EXISTS "Workers are viewable by company and vendor users" ON public.workers;

CREATE POLICY "Workers are viewable by company and vendor users"
ON public.workers FOR SELECT
USING (
  -- Company users see all workers in their company
  (company_id IN (SELECT get_user_companies(auth.uid())))
  OR 
  -- Workers see themselves
  (user_id = auth.uid())
  OR
  -- Vendors see only their workers
  (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);