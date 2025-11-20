-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_task_id UUID REFERENCES public.job_tasks(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bom (Bill of Materials) table
CREATE TABLE IF NOT EXISTS public.bom (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  variance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;

-- Time entries RLS policies
CREATE POLICY "Workers can view their own time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = time_entries.worker_id
      AND workers.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can create their own time entries"
  ON public.time_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = time_entries.worker_id
      AND workers.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own time entries"
  ON public.time_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = time_entries.worker_id
      AND workers.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view their workers time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workers w
      JOIN public.vendors v ON v.id = w.vendor_id
      WHERE w.id = time_entries.worker_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can view all time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.user_roles ur ON ur.company_id = j.company_id
      WHERE j.id = time_entries.job_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'company'::app_role
    )
  );

-- BOM RLS policies
CREATE POLICY "Company admins can manage BOM"
  ON public.bom
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.user_roles ur ON ur.company_id = j.company_id
      WHERE j.id = bom.job_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'company'::app_role
    )
  );

CREATE POLICY "Vendors can view BOM for their jobs"
  ON public.bom
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.vendors v ON v.id = j.assigned_to_vendor_id
      WHERE j.id = bom.job_id
      AND v.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_time_entries_worker_id ON public.time_entries(worker_id);
CREATE INDEX idx_time_entries_job_id ON public.time_entries(job_id);
CREATE INDEX idx_time_entries_created_at ON public.time_entries(created_at DESC);
CREATE INDEX idx_bom_job_id ON public.bom(job_id);

-- Create updated_at triggers
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bom_updated_at
  BEFORE UPDATE ON public.bom
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();