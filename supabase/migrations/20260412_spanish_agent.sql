ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS retell_agent_id_es TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
