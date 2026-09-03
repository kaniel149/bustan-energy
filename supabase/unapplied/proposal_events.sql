-- proposal_events: tracks all interactions with proposals
-- Run this in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS proposal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    proposal_ref TEXT,
    event TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id ON proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_ref ON proposal_events(proposal_ref);
CREATE INDEX IF NOT EXISTS idx_proposal_events_event ON proposal_events(event);

ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (client-side tracking, no auth needed)
CREATE POLICY "Anyone can insert proposal events"
    ON proposal_events FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can read events (CRM dashboard)
CREATE POLICY "Authenticated users can read events"
    ON proposal_events FOR SELECT
    USING (auth.role() = 'authenticated');
