-- Fix team deletion RLS - need to check if team is used in jobs or tasks first
-- Add new columns for better notifications and deadline tracking

-- Drop existing DELETE policy on teams
DROP POLICY IF EXISTS "Companies and vendors can delete teams" ON public.teams;

-- Create new DELETE policy for teams
CREATE POLICY "Companies and vendors can delete teams"
ON public.teams
FOR DELETE
USING (
  has_role(auth.uid(), 'company'::app_role, company_id) 
  OR (vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  ))
);

-- Add team head notification when job is assigned to team
-- This will be handled in the application layer

-- Create notification preferences for deadline alerts
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS deadline_notified boolean DEFAULT false;

-- Create index for better performance on activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_recipient ON public.activity_logs(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable real-time for activity_logs
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;