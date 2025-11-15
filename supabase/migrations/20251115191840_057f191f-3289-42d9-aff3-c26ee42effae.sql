-- Enable realtime for activity_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Enable realtime for job_tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_tasks;
ALTER TABLE public.job_tasks REPLICA IDENTITY FULL;

-- Enable realtime for team_tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_tasks;
ALTER TABLE public.team_tasks REPLICA IDENTITY FULL;