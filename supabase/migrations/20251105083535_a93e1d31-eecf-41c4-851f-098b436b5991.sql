-- Add DELETE policy for workers table
DROP POLICY IF EXISTS "Workers can be deleted by companies and vendors" ON public.workers;

CREATE POLICY "Workers can be deleted by companies and vendors"
ON public.workers
FOR DELETE
USING (
  has_role(auth.uid(), 'company'::app_role, company_id) 
  OR (vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  ))
);

-- Add role field to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS role text;

-- Add team info columns to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS team_role text;

-- Add billing tables
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  job_id uuid REFERENCES public.jobs(id),
  amount decimal(12, 2) NOT NULL,
  tax decimal(12, 2) DEFAULT 0,
  total_amount decimal(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  paid_date timestamp with time zone,
  notes text,
  items jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices are viewable by company and vendor users"
ON public.invoices
FOR SELECT
USING (
  company_id IN (SELECT get_user_companies(auth.uid()))
  OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

CREATE POLICY "Companies can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'company'::app_role, company_id));

-- Add notification/deadline tracking to activity_logs
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS notification_type text,
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recipient_id uuid;

-- Create index for faster deadline queries
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON public.jobs(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_tasks_deadline ON public.job_tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_tasks_deadline ON public.team_tasks(deadline) WHERE deadline IS NOT NULL;

-- Add trigger for invoice updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();