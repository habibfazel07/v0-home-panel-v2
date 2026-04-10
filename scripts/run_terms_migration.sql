-- Migration: Add terms consent and product interests to enquiries table
-- This script adds columns if they don't exist

DO $$ 
BEGIN
  -- Add terms_accepted column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'terms_accepted') THEN
    ALTER TABLE enquiries ADD COLUMN terms_accepted BOOLEAN DEFAULT false;
  END IF;
  
  -- Add terms_accepted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'terms_accepted_at') THEN
    ALTER TABLE enquiries ADD COLUMN terms_accepted_at TIMESTAMPTZ;
  END IF;
  
  -- Add marketing_consent column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'marketing_consent') THEN
    ALTER TABLE enquiries ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
  END IF;
  
  -- Add marketing_consent_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'marketing_consent_at') THEN
    ALTER TABLE enquiries ADD COLUMN marketing_consent_at TIMESTAMPTZ;
  END IF;
  
  -- Add interest_solar column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'interest_solar') THEN
    ALTER TABLE enquiries ADD COLUMN interest_solar BOOLEAN DEFAULT false;
  END IF;
  
  -- Add interest_boiler column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'interest_boiler') THEN
    ALTER TABLE enquiries ADD COLUMN interest_boiler BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'enquiries' 
AND column_name IN ('terms_accepted', 'terms_accepted_at', 'marketing_consent', 'marketing_consent_at', 'interest_solar', 'interest_boiler');
