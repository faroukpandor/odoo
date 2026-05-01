-- Collaboration activity tracking
CREATE TABLE IF NOT EXISTS collaboration_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'viewing', 'editing', 'commenting'
  entity TEXT NOT NULL, -- table name
  entity_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE collaboration_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see activity in their organization
CREATE POLICY "org_isolation_collab" ON collaboration_activity
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_activity;

-- Index for performance
CREATE INDEX idx_collab_org_time ON collaboration_activity(organization_id, timestamp DESC);
CREATE INDEX idx_collab_entity ON collaboration_activity(organization_id, entity, entity_id);
