-- Fix chat_participants RLS policy (remove recursion)
DROP POLICY IF EXISTS "Users can view participants in their chat rooms" ON public.chat_participants;

CREATE POLICY "Users can view participants in their chat rooms" 
ON public.chat_participants 
FOR SELECT 
USING (user_id = auth.uid());

-- Add room_type to chat_rooms for different chat types
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'public';

-- Create quality_control table
CREATE TABLE IF NOT EXISTS public.quality_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_task_id UUID REFERENCES public.job_tasks(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL,
  inspector_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  checklist JSONB DEFAULT '[]'::jsonb,
  defects JSONB DEFAULT '[]'::jsonb,
  rework_required BOOLEAN DEFAULT false,
  rework_notes TEXT,
  passed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quality_control
ALTER TABLE public.quality_control ENABLE ROW LEVEL SECURITY;

-- Quality control policies
CREATE POLICY "Users can view QC in their companies"
ON public.quality_control
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = quality_control.job_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage QC in their companies"
ON public.quality_control
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = quality_control.job_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('company', 'vendor')
  )
);

-- Add QC status to job_tasks
ALTER TABLE public.job_tasks ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'pending';

-- Create trigger for quality_control updated_at
CREATE OR REPLACE TRIGGER update_quality_control_updated_at
BEFORE UPDATE ON public.quality_control
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indices
CREATE INDEX IF NOT EXISTS idx_quality_control_job_id ON public.quality_control(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_control_job_task_id ON public.quality_control(job_task_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_type ON public.chat_rooms(room_type);