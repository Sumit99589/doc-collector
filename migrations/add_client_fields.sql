-- Migration to add new fields to clients table for generic client support
-- Run this in your Supabase SQL editor

-- Add new columns to the clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_accountancy_firm BOOLEAN DEFAULT false;

-- Update existing records to have default values
UPDATE clients SET is_accountancy_firm = true WHERE is_accountancy_firm IS NULL;

-- Create index for better performance on the new boolean field
CREATE INDEX IF NOT EXISTS idx_clients_is_accountancy_firm ON clients(is_accountancy_firm);

-- Add comment to document the field purpose
COMMENT ON COLUMN clients.is_accountancy_firm IS 'Indicates if this client is for an accountancy firm (true) or generic use (false)';
