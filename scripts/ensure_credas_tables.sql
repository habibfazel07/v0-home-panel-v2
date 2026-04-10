-- Ensure enquiries table has all required columns for Credas integration
-- Run this in Supabase SQL Editor

-- Add onboarding columns to enquiries if they don't exist
DO $$ 
BEGIN
  -- onboarding_token
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'onboarding_token') THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_token TEXT UNIQUE;
  END IF;
  
  -- onboarding_data (JSONB for storing Credas invite IDs, verification status, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'onboarding_data') THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_data JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- onboarding_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'onboarding_status') THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_status TEXT DEFAULT 'pending';
  END IF;
  
  -- onboarding_sent_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'onboarding_sent_at') THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_sent_at TIMESTAMPTZ;
  END IF;
  
  -- onboarding_completed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'onboarding_completed_at') THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
  
  -- updated_at (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'updated_at') THEN
    ALTER TABLE enquiries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE CASCADE,
  case_id UUID,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'client', 'webhook')),
  actor_id TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on enquiry_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_enquiry_id ON activity_log(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Create index on onboarding_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_enquiries_onboarding_token ON enquiries(onboarding_token) WHERE onboarding_token IS NOT NULL;

-- Grant permissions (adjust role names as needed)
GRANT ALL ON activity_log TO authenticated;
GRANT ALL ON activity_log TO service_role;

-- Success message
SELECT 'Credas tables and columns configured successfully' AS status;
