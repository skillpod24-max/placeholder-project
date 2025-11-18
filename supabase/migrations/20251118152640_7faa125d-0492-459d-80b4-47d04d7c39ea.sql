-- Add industry_type to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_type text DEFAULT 'general' CHECK (industry_type IN ('general', 'manufacturing', 'it'));

-- Update existing companies to have a default industry type
UPDATE companies SET industry_type = 'general' WHERE industry_type IS NULL;

-- Enable real-time for notifications (activity_logs already has replica identity)
-- ALTER TABLE activity_logs REPLICA IDENTITY FULL; -- Already configured

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_recipient_created ON activity_logs(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_unread ON activity_logs(recipient_id, is_read, created_at DESC);

-- Add deadline notification tracking
COMMENT ON COLUMN activity_logs.deadline_notified IS 'Tracks if a deadline notification has been sent to avoid duplicates';