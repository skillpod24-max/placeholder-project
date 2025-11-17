-- Add industry type and custom fields for flexible job/task management
-- This supports both IT and manufacturing industries

-- Add industry column to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'general';

-- Add custom metadata fields to jobs for flexible data
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add custom metadata fields to job_tasks for flexible data
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add equipment/resource tracking for manufacturing
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'equipment', 'tool', 'material', 'software', etc.
  quantity INTEGER DEFAULT 1,
  unit TEXT, -- 'pieces', 'kg', 'liters', 'licenses', etc.
  status TEXT DEFAULT 'available',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for resources
CREATE POLICY "Users can view resources in their companies"
  ON resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.company_id = resources.company_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage resources"
  ON resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.company_id = resources.company_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role = 'company'
    )
  );

-- Resource allocation table for jobs/tasks
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'job', 'job_task', 'team_task'
  entity_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1,
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  allocated_by UUID NOT NULL,
  notes TEXT
);

-- Enable RLS on resource_allocations
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for resource_allocations
CREATE POLICY "Users can view resource allocations in their companies"
  ON resource_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      JOIN user_roles ur ON ur.company_id = r.company_id
      WHERE r.id = resource_allocations.resource_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Company and vendor admins can manage resource allocations"
  ON resource_allocations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      JOIN user_roles ur ON ur.company_id = r.company_id
      WHERE r.id = resource_allocations.resource_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('company', 'vendor')
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_company_id ON resources(company_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource_id ON resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_entity ON resource_allocations(entity_type, entity_id);

-- Update trigger for resources
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();