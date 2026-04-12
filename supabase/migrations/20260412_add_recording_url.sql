-- Add recording_url column to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
