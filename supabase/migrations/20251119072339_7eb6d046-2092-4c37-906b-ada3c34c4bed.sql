-- Fix chat room RLS policies to allow proper access
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON chat_rooms;
DROP POLICY IF EXISTS "Authenticated users can create chat rooms" ON chat_rooms;

-- Allow users to view chat rooms in their company's jobs
CREATE POLICY "Users can view chat rooms in their jobs"
ON chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = chat_rooms.entity_id::uuid
    AND ur.user_id = auth.uid()
    AND chat_rooms.entity_type = 'job'
  )
);

-- Allow authenticated users in the company to create chat rooms
CREATE POLICY "Users can create chat rooms for their jobs"
ON chat_rooms
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = entity_id::uuid
    AND ur.user_id = auth.uid()
    AND entity_type = 'job'
  )
);

-- Create invoice approval workflow table
CREATE TABLE IF NOT EXISTS invoice_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE invoice_approvals ENABLE ROW LEVEL SECURITY;

-- RLS for invoice approvals
CREATE POLICY "Company admins can manage invoice approvals"
ON invoice_approvals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.company_id = invoice_approvals.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'company'
  )
);

CREATE POLICY "Vendors can view their invoice approvals"
ON invoice_approvals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN vendors v ON v.id = i.vendor_id
    WHERE i.id = invoice_approvals.invoice_id
    AND v.user_id = auth.uid()
  )
);

-- Create sprints table for IT projects
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  goal TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sprints in their company"
ON sprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.company_id = sprints.company_id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Company and vendor admins can manage sprints"
ON sprints
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.company_id = sprints.company_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role IN ('company', 'vendor')
  )
);

-- Add sprint_id to job_tasks
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id);

-- Create job order history table for complete tracking
CREATE TABLE IF NOT EXISTS job_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE job_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job history in their company"
ON job_order_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN user_roles ur ON ur.company_id = j.company_id
    WHERE j.id = job_order_history.job_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create job history"
ON job_order_history
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_invoice_id ON invoice_approvals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_company_id ON invoice_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_sprints_company_id ON sprints(company_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_sprint_id ON job_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_job_order_history_job_id ON job_order_history(job_id);

-- Add trigger for updated_at
CREATE TRIGGER update_invoice_approvals_updated_at
BEFORE UPDATE ON invoice_approvals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at
BEFORE UPDATE ON sprints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();