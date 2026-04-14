-- Create a location_group table for grouping restaurants under one owner
CREATE TABLE IF NOT EXISTS location_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add location_group_id to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS location_group_id UUID REFERENCES location_groups(id);

-- Enable RLS
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;

-- Policies for location_groups
DROP POLICY IF EXISTS "location_groups_select_own" ON location_groups;
CREATE POLICY "location_groups_select_own" ON location_groups
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "location_groups_insert_own" ON location_groups;
CREATE POLICY "location_groups_insert_own" ON location_groups
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "location_groups_update_own" ON location_groups;
CREATE POLICY "location_groups_update_own" ON location_groups
  FOR UPDATE USING (owner_user_id = auth.uid());
