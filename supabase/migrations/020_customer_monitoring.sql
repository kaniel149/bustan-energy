-- =====================================================
-- 020_customer_monitoring.sql
-- Customer systems monitoring MVP — foundation for the
-- monthly monitoring retainer service.
--   customer_systems : installed PV systems we monitor
--   system_readings  : daily production readings (manual or API)
-- (numbered 020 to stay clear of concurrent 018/019 work)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,

  -- Site / system
  site_name text NOT NULL,
  system_kwp numeric(8,2) NOT NULL,
  inverter_brand text NOT NULL DEFAULT 'other' CHECK (
    inverter_brand IN ('huawei', 'solaredge', 'sungrow', 'growatt', 'other')
  ),
  inverter_api_id text,                    -- plant/site id in the vendor monitoring portal (for future API auto-fetch)
  install_date date,

  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'archived')
  ),
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.customer_systems(id) ON DELETE CASCADE,
  date date NOT NULL,
  kwh_produced numeric(10,2) NOT NULL,
  expected_kwh numeric(10,2),              -- nullable: UI/cron fall back to system_kwp * 4 (≈Thailand PSH)
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('api', 'manual')),
  created_at timestamptz DEFAULT now(),

  -- one reading per system per day (manual entry upserts on this)
  CONSTRAINT system_readings_system_date_key UNIQUE (system_id, date)
);

CREATE INDEX IF NOT EXISTS idx_customer_systems_status ON public.customer_systems(status);
CREATE INDEX IF NOT EXISTS idx_customer_systems_created_at ON public.customer_systems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_readings_system_date ON public.system_readings(system_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_system_readings_date ON public.system_readings(date DESC);

-- Auto-update updated_at trigger (same pattern as procurement_orders)
CREATE OR REPLACE FUNCTION bump_customer_systems_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_customer_systems_updated_at ON public.customer_systems;
CREATE TRIGGER trg_bump_customer_systems_updated_at
  BEFORE UPDATE ON public.customer_systems
  FOR EACH ROW EXECUTE FUNCTION bump_customer_systems_updated_at();

-- ── RLS ──
-- Writes go through admin-gated API endpoints (service role).
-- Authenticated (admin UI session) may read.
ALTER TABLE public.customer_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_customer_systems" ON public.customer_systems;
CREATE POLICY "service_role_all_customer_systems" ON public.customer_systems
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_customer_systems" ON public.customer_systems;
CREATE POLICY "admin_read_customer_systems" ON public.customer_systems
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_role_all_system_readings" ON public.system_readings;
CREATE POLICY "service_role_all_system_readings" ON public.system_readings
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_system_readings" ON public.system_readings;
CREATE POLICY "admin_read_system_readings" ON public.system_readings
  FOR SELECT USING (auth.role() = 'authenticated');
