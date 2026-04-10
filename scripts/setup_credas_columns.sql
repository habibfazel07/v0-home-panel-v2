-- Add Credas-related columns to enquiries table
-- This ensures the onboarding_data column exists for storing Credas invite IDs

-- First, ensure the enquiries table exists with the onboarding_token column
DO $$ 
BEGIN
  -- Add onboarding_token if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enquiries' AND column_name = 'onboarding_token'
  ) THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_token TEXT UNIQUE;
  END IF;

  -- Add onboarding_data if it doesn't exist (JSONB for storing Credas data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enquiries' AND column_name = 'onboarding_data'
  ) THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_data JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add onboarding_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enquiries' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE enquiries ADD COLUMN onboarding_status TEXT DEFAULT 'not_started';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enquiries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE enquiries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES enquiries(id),
  case_id UUID,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on enquiry_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_enquiry_id ON activity_log(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_onboarding_token ON enquiries(onboarding_token);

-- Grant permissions
GRANT ALL ON activity_log TO authenticated;
GRANT ALL ON activity_log TO service_role;
