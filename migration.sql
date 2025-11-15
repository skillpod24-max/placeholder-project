create table public.activity_logs (
  id uuid not null default gen_random_uuid (),
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid not null,
  action_type text not null,
  old_value text null,
  new_value text null,
  notes text null,
  progress_percentage integer null,
  created_at timestamp with time zone null default now(),
  notification_type text null,
  is_read boolean null default false,
  recipient_id uuid null,
  deadline_notified boolean null default false,
  constraint activity_logs_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_recipient on public.activity_logs using btree (recipient_id) TABLESPACE pg_default
where
  (recipient_id is not null);

create index IF not exists idx_activity_logs_entity on public.activity_logs using btree (entity_type, entity_id) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_created_at on public.activity_logs using btree (created_at desc) TABLESPACE pg_default;

create table public.companies (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint companies_pkey primary key (id)
) TABLESPACE pg_default;

create trigger update_companies_updated_at BEFORE
update on companies for EACH row
execute FUNCTION update_updated_at_column ();

create table public.invoices (
  id uuid not null default gen_random_uuid (),
  invoice_number text not null,
  company_id uuid not null,
  vendor_id uuid not null,
  job_id uuid null,
  amount numeric(12, 2) not null,
  tax numeric(12, 2) null default 0,
  total_amount numeric(12, 2) not null,
  status text not null default 'draft'::text,
  issue_date timestamp with time zone not null default now(),
  due_date timestamp with time zone null,
  paid_date timestamp with time zone null,
  notes text null,
  items jsonb null default '[]'::jsonb,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint invoices_pkey primary key (id),
  constraint invoices_invoice_number_key unique (invoice_number),
  constraint invoices_company_id_fkey foreign KEY (company_id) references companies (id),
  constraint invoices_job_id_fkey foreign KEY (job_id) references jobs (id),
  constraint invoices_vendor_id_fkey foreign KEY (vendor_id) references vendors (id)
) TABLESPACE pg_default;

create trigger update_invoices_updated_at BEFORE
update on invoices for EACH row
execute FUNCTION update_updated_at_column ();

create table public.job_activities (
  id uuid not null default gen_random_uuid (),
  job_id uuid not null,
  user_id uuid not null,
  activity_type text not null,
  description text not null,
  old_status public.job_status null,
  new_status public.job_status null,
  created_at timestamp with time zone not null default now(),
  constraint job_activities_pkey primary key (id),
  constraint job_activities_job_id_fkey foreign KEY (job_id) references jobs (id) on delete CASCADE,
  constraint job_activities_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.job_tasks (
  id uuid not null default gen_random_uuid (),
  job_id uuid not null,
  vendor_id uuid not null,
  assigned_to_worker_id uuid null,
  title text not null,
  description text null,
  deadline timestamp with time zone null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  assigned_by uuid null,
  assigned_at timestamp with time zone null,
  daily_updates jsonb null default '[]'::jsonb,
  progress_percentage integer null default 0,
  assigned_to_team_id uuid null,
  constraint job_tasks_pkey primary key (id),
  constraint job_tasks_assigned_to_team_id_fkey foreign KEY (assigned_to_team_id) references teams (id),
  constraint job_tasks_assigned_to_worker_id_fkey foreign KEY (assigned_to_worker_id) references workers (id) on delete set null,
  constraint job_tasks_job_id_fkey foreign KEY (job_id) references jobs (id) on delete CASCADE,
  constraint job_tasks_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete CASCADE,
  constraint job_tasks_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id),
  constraint job_tasks_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'assigned'::text,
          'in_progress'::text,
          'completed'::text
        ]
      )
    )
  ),
  constraint job_tasks_progress_percentage_check check (
    (
      (progress_percentage >= 0)
      and (progress_percentage <= 100)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_job_tasks_deadline on public.job_tasks using btree (deadline) TABLESPACE pg_default
where
  (deadline is not null);

create trigger update_job_tasks_updated_at BEFORE
update on job_tasks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.jobs (
  id uuid not null default gen_random_uuid (),
  company_id uuid not null,
  title text not null,
  description text null,
  status public.job_status not null default 'created'::job_status,
  assigned_to_vendor_id uuid null,
  assigned_to_worker_id uuid null,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  requirements text null,
  deadline timestamp with time zone null,
  assigned_by uuid null,
  assigned_at timestamp with time zone null,
  assigned_to_team_id uuid null,
  constraint jobs_pkey primary key (id),
  constraint jobs_assigned_to_team_id_fkey foreign KEY (assigned_to_team_id) references teams (id),
  constraint jobs_assigned_to_vendor_id_fkey foreign KEY (assigned_to_vendor_id) references vendors (id) on delete set null,
  constraint jobs_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id),
  constraint jobs_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint jobs_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint jobs_assigned_to_worker_id_fkey foreign KEY (assigned_to_worker_id) references workers (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_jobs_deadline on public.jobs using btree (deadline) TABLESPACE pg_default
where
  (deadline is not null);

create trigger update_jobs_updated_at BEFORE
update on jobs for EACH row
execute FUNCTION update_updated_at_column ();

create table public.team_members (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  worker_id uuid not null,
  role text null,
  added_by uuid not null,
  added_at timestamp with time zone not null default now(),
  constraint team_members_pkey primary key (id),
  constraint team_members_team_id_worker_id_key unique (team_id, worker_id),
  constraint team_members_added_by_fkey foreign KEY (added_by) references auth.users (id),
  constraint team_members_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint team_members_worker_id_fkey foreign KEY (worker_id) references workers (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.team_tasks (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  job_task_id uuid null,
  job_id uuid null,
  title text not null,
  description text null,
  assigned_to_worker_id uuid null,
  assigned_by uuid not null,
  assigned_at timestamp with time zone not null default now(),
  status text not null default 'pending'::text,
  deadline timestamp with time zone null,
  daily_updates jsonb null default '[]'::jsonb,
  progress_percentage integer null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint team_tasks_pkey primary key (id),
  constraint team_tasks_assigned_to_worker_id_fkey foreign KEY (assigned_to_worker_id) references workers (id) on delete set null,
  constraint team_tasks_job_id_fkey foreign KEY (job_id) references jobs (id) on delete CASCADE,
  constraint team_tasks_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id),
  constraint team_tasks_job_task_id_fkey foreign KEY (job_task_id) references job_tasks (id) on delete CASCADE,
  constraint team_tasks_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint team_tasks_progress_percentage_check check (
    (
      (progress_percentage >= 0)
      and (progress_percentage <= 100)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_team_tasks_deadline on public.team_tasks using btree (deadline) TABLESPACE pg_default
where
  (deadline is not null);

create trigger update_team_tasks_updated_at BEFORE
update on team_tasks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.teams (
  id uuid not null default gen_random_uuid (),
  name text not null,
  company_id uuid not null,
  vendor_id uuid null,
  team_head_id uuid null,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teams_pkey primary key (id),
  constraint teams_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint teams_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint teams_team_head_id_fkey foreign KEY (team_head_id) references workers (id) on delete set null,
  constraint teams_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_teams_updated_at BEFORE
update on teams for EACH row
execute FUNCTION update_updated_at_column ();

create table public.user_roles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  company_id uuid not null,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  constraint user_roles_pkey primary key (id),
  constraint user_roles_user_id_company_id_role_key unique (user_id, company_id, role),
  constraint user_roles_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint user_roles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.vendor_companies (
  id uuid not null default gen_random_uuid (),
  vendor_id uuid not null,
  company_id uuid not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint vendor_companies_pkey primary key (id),
  constraint vendor_companies_vendor_id_company_id_key unique (vendor_id, company_id),
  constraint vendor_companies_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint vendor_companies_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.vendors (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  company_id uuid not null,
  name text not null,
  email text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint vendors_pkey primary key (id),
  constraint vendors_user_id_company_id_key unique (user_id, company_id),
  constraint vendors_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint vendors_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_vendors_updated_at BEFORE
update on vendors for EACH row
execute FUNCTION update_updated_at_column ();

create table public.workers (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  company_id uuid not null,
  vendor_id uuid null,
  name text not null,
  email text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  role text null,
  team_role text null,
  constraint workers_pkey primary key (id),
  constraint workers_user_id_company_id_key unique (user_id, company_id),
  constraint workers_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint workers_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint workers_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete set null
) TABLESPACE pg_default;

create trigger update_workers_updated_at BEFORE
update on workers for EACH row
execute FUNCTION update_updated_at_column ();