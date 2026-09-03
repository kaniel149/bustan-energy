-- Bustan Energy Leads Table
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  property_type TEXT,
  monthly_bill NUMERIC,
  roof_type TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new',
  notes TEXT,
  assigned_to TEXT
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert leads (from website forms)
CREATE POLICY "Allow anon inserts" ON leads FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to read all leads (for CRM/admin)
CREATE POLICY "Allow authenticated read" ON leads FOR SELECT TO authenticated USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
