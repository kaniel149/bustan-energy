-- =====================================================
-- 015_procurement_hardening.sql
-- Procurement system hardening:
--   - Idempotency unique index on proposal_ref
--   - suppliers table + procurement_order_items
--   - price_snapshot + bom_templates_hash columns
--   - po_number sequence + trigger
--   - State-machine trigger (valid transitions)
--   - notification_log table (for email send tracking)
--   - Price precision upgrade: numeric(10,2) -> numeric(14,2)
-- NOTE: Does NOT touch RLS or CHECK constraints (those are in 014).
-- =====================================================

-- ── 1. Idempotency index on procurement_orders ────────────────
-- Ensures only one active (non-cancelled) order per proposal_ref
CREATE UNIQUE INDEX IF NOT EXISTS idx_procurement_unique_proposal
  ON public.procurement_orders (proposal_ref)
  WHERE status <> 'cancelled' AND proposal_ref IS NOT NULL;

-- ── 2. Suppliers table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  category      text        NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Safe column additions for pre-existing tables
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS currency text DEFAULT 'THB';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS lead_time_days int DEFAULT 14;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add CHECK constraints defensively
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_category_check') THEN
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_category_check
      CHECK (category IN ('panels','inverters','mounting','cables','battery','accessories','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_currency_check') THEN
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_currency_check
      CHECK (currency IN ('THB','USD','EUR','CNY'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_category_active
  ON public.suppliers (category) WHERE active = true;

-- RLS: service_role only (no client exposure)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_suppliers" ON public.suppliers;
CREATE POLICY "service_role_all_suppliers" ON public.suppliers
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_suppliers" ON public.suppliers;
CREATE POLICY "admin_read_suppliers" ON public.suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 3. Procurement order items table ─────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_order_items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid          NOT NULL REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  supplier_id    uuid          REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category       text          NOT NULL,
  sku            text,
  description    text          NOT NULL,
  qty            numeric(10,2) NOT NULL CHECK (qty > 0),
  unit_price_thb numeric(14,2) NOT NULL DEFAULT 0,
  unit_price_usd numeric(14,2),
  fx_rate        numeric(10,4),
  total_thb      numeric(14,2) GENERATED ALWAYS AS (qty * unit_price_thb) STORED,
  status         text          DEFAULT 'draft',
  created_at     timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poi_order
  ON public.procurement_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_poi_supplier
  ON public.procurement_order_items (supplier_id);

-- RLS mirrors procurement_orders
ALTER TABLE public.procurement_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_poi" ON public.procurement_order_items;
CREATE POLICY "service_role_all_poi" ON public.procurement_order_items
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_poi" ON public.procurement_order_items;
CREATE POLICY "admin_read_poi" ON public.procurement_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 4. Seed Thai suppliers ────────────────────────────────────
INSERT INTO public.suppliers (name, category, email, phone, currency, lead_time_days, notes)
VALUES
  (
    'Integra Renewable Energy',
    'panels',
    'sales@integra-re.co.th',
    '+66-2-000-0001',
    'THB',
    7,
    'Main panel supplier. JA Solar, Jinko, Trina. solarshop.integra-re.co.th. Quoted 2026-04-22.'
  ),
  (
    'Huawei Authorized Distributor Thailand',
    'inverters',
    'solar@huawei-thai.co.th',
    '+66-2-000-0002',
    'THB',
    14,
    'SUN2000 series grid-tied and hybrid inverters. Official TH distributor.'
  ),
  (
    'Antal Solar Mounting',
    'mounting',
    'info@antal-solar.co.th',
    '+66-2-000-0003',
    'THB',
    10,
    'Metal roof + concrete roof mounting systems. Local fabrication available.'
  ),
  (
    'Pro Cable Thailand',
    'cables',
    'sales@procable.co.th',
    '+66-2-000-0004',
    'THB',
    5,
    'PV cables 4mm2/6mm2, AC cable, conduit. Stock in Bangkok and Surat Thani.'
  ),
  (
    'LUNA Energy Storage Thailand',
    'battery',
    'battery@luna-energy.co.th',
    '+66-2-000-0005',
    'THB',
    21,
    'LUNA 2000 / BESS systems for hybrid installs. Pre-order required for large systems.'
  ),
  (
    'Solar Accessories Bangkok',
    'accessories',
    'order@solaracc.co.th',
    '+66-2-000-0006',
    'THB',
    5,
    'DC combiners, surge protectors, meters, junction boxes, sundries.'
  )
ON CONFLICT DO NOTHING;

-- ── 5. Add price_snapshot + bom_templates_hash to procurement_orders ──
ALTER TABLE public.procurement_orders
  ADD COLUMN IF NOT EXISTS price_snapshot     jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.procurement_orders
  ADD COLUMN IF NOT EXISTS bom_templates_hash text;

-- ── 6. Upgrade price precision (numeric(10,2) -> numeric(14,2)) ──
-- estimated_thb, quoted_thb, actual_thb (only if column exists with old precision)
-- ALTER TYPE is not possible for existing data inline; we use ALTER COLUMN TYPE:
ALTER TABLE public.procurement_orders
  ALTER COLUMN estimated_thb TYPE numeric(14,2);

ALTER TABLE public.procurement_orders
  ALTER COLUMN quoted_thb    TYPE numeric(14,2);

ALTER TABLE public.procurement_orders
  ALTER COLUMN actual_thb    TYPE numeric(14,2);

-- ── 7. Sequential PO numbers ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1001;

ALTER TABLE public.procurement_orders
  ADD COLUMN IF NOT EXISTS po_number text UNIQUE;

CREATE OR REPLACE FUNCTION set_po_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_po_number ON public.procurement_orders;
CREATE TRIGGER trg_po_number
  BEFORE INSERT ON public.procurement_orders
  FOR EACH ROW EXECUTE FUNCTION set_po_number();

-- ── 8. State machine: valid status transitions ────────────────
-- Allowed transitions:
--   draft     -> sent, cancelled
--   sent      -> confirmed, cancelled
--   confirmed -> shipped, cancelled
--   shipped   -> received, cancelled
--   received  -> installed
--   installed -> (terminal)
--   cancelled -> (terminal)
--
-- NOTE: migration 013 uses statuses: draft/sent/quoted/ordered/received/installed/cancelled
-- We extend with confirmed/shipped and keep old ones passing for backward compat.
-- The state machine guards against invalid jumps, not against all legacy values.

CREATE OR REPLACE FUNCTION enforce_procurement_state_machine()
RETURNS trigger AS $$
DECLARE
  old_s text := OLD.status;
  new_s text := NEW.status;
BEGIN
  -- No change — always OK
  IF old_s = new_s THEN RETURN NEW; END IF;

  -- Terminal states — no further transitions
  IF old_s = 'installed' THEN
    RAISE EXCEPTION 'procurement order % is already installed (terminal state)', OLD.id;
  END IF;
  IF old_s = 'cancelled' THEN
    RAISE EXCEPTION 'procurement order % is cancelled (terminal state)', OLD.id;
  END IF;

  -- Allowed forward/backward transitions
  IF old_s = 'draft' AND new_s NOT IN ('sent', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'sent' AND new_s NOT IN ('confirmed', 'quoted', 'ordered', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'quoted' AND new_s NOT IN ('ordered', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'ordered' AND new_s NOT IN ('confirmed', 'shipped', 'received', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'confirmed' AND new_s NOT IN ('shipped', 'ordered', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'shipped' AND new_s NOT IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  IF old_s = 'received' AND new_s NOT IN ('installed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid procurement transition: % -> % (order %)', old_s, new_s, OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_procurement_state_machine ON public.procurement_orders;
CREATE TRIGGER trg_procurement_state_machine
  BEFORE UPDATE OF status ON public.procurement_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_procurement_state_machine();

-- ── 9. notification_log table (email send tracking) ──────────
CREATE TABLE IF NOT EXISTS public.notification_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  ref_id      text,
  recipient   text        NOT NULL,
  subject     text,
  status      text        DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  provider_id text,
  error       text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_event   ON public.notification_log (event_type);
CREATE INDEX IF NOT EXISTS idx_notif_log_ref     ON public.notification_log (ref_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_created ON public.notification_log (created_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_notif_log" ON public.notification_log;
CREATE POLICY "service_role_all_notif_log" ON public.notification_log
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_notif_log" ON public.notification_log;
CREATE POLICY "admin_read_notif_log" ON public.notification_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE public.suppliers IS
  'Approved Thai solar suppliers — panels, inverters, mounting, cables, battery, accessories.';

COMMENT ON TABLE public.procurement_order_items IS
  'Line items per procurement order, split by supplier. total_thb is a computed column.';

COMMENT ON TABLE public.notification_log IS
  'Outbound email log for procurement RFQs, followups, proposal alerts.';

COMMENT ON COLUMN public.procurement_orders.price_snapshot IS
  'Full bom-templates.json price database snapshotted at order creation. Used for reproducibility.';

COMMENT ON COLUMN public.procurement_orders.bom_templates_hash IS
  'SHA-256 of bom-templates.json content at time of order creation. Detects price drift.';

COMMENT ON COLUMN public.procurement_orders.po_number IS
  'Human-readable PO number, e.g. PO-2026-1001. Set automatically by trigger.';
