-- =====================================================
-- 013_procurement_orders.sql
-- Procurement orders (supplier BOMs) — closes the loop
-- between signed proposals → materials ordered → installed
-- =====================================================

CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to existing entities
  proposal_ref text,                       -- FK to proposals.ref_number (not enforced — proposals may be deleted)
  lead_id uuid,                            -- FK to projects.id (CRM lead)

  -- System specs snapshot (at time of BOM generation)
  bom_template text NOT NULL,              -- 'grid-tied-commercial-metal-roof' | 'hybrid-commercial-with-battery'
  system_kwp numeric(8,2) NOT NULL,
  panels integer NOT NULL,
  panel_watt integer NOT NULL,
  battery_kwh integer DEFAULT 0,

  -- BOM payload (full structure — for exact reproducibility)
  bom_json jsonb NOT NULL,                 -- { summary, categories, totals }
  supplier_email_text text,                -- the copy-pasteable RFQ

  -- Supplier info
  supplier_name text,
  supplier_email text,
  supplier_phone text,

  -- Pricing (all in THB)
  estimated_thb numeric(10,2),             -- what our template says
  quoted_thb numeric(10,2),                -- supplier's quote
  actual_thb numeric(10,2),                -- what we actually paid

  -- Status workflow
  status text DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'quoted', 'ordered', 'received', 'installed', 'cancelled')
  ),
  sent_at timestamptz,
  quoted_at timestamptz,
  ordered_at timestamptz,
  received_at timestamptz,
  installed_at timestamptz,

  -- Notes + meta
  notes text,
  created_by text,                         -- admin email
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_proposal_ref ON public.procurement_orders(proposal_ref);
CREATE INDEX IF NOT EXISTS idx_procurement_lead_id ON public.procurement_orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_procurement_status ON public.procurement_orders(status);
CREATE INDEX IF NOT EXISTS idx_procurement_created_at ON public.procurement_orders(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION bump_procurement_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_procurement_updated_at ON public.procurement_orders;
CREATE TRIGGER trg_bump_procurement_updated_at
  BEFORE UPDATE ON public.procurement_orders
  FOR EACH ROW EXECUTE FUNCTION bump_procurement_updated_at();

-- ── RLS ──
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_procurement" ON public.procurement_orders;
CREATE POLICY "service_role_all_procurement" ON public.procurement_orders
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_read_procurement" ON public.procurement_orders;
CREATE POLICY "admin_read_procurement" ON public.procurement_orders
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── Sync back to projects (CRM pipeline) ──
-- When a procurement order advances, update the linked CRM project's status
CREATE OR REPLACE FUNCTION sync_project_from_procurement()
RETURNS trigger AS $$
BEGIN
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;

  -- Map procurement status → CRM project status
  -- (only updates if the project exists — safe no-op otherwise)
  UPDATE public.projects
  SET
    status = CASE NEW.status
      WHEN 'draft'     THEN COALESCE(status, 'signed')
      WHEN 'sent'      THEN 'procurement'
      WHEN 'quoted'    THEN 'procurement'
      WHEN 'ordered'   THEN 'procurement'
      WHEN 'received'  THEN 'ready_to_install'
      WHEN 'installed' THEN 'installed'
      WHEN 'cancelled' THEN status  -- don't downgrade
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_project_from_procurement ON public.procurement_orders;
CREATE TRIGGER trg_sync_project_from_procurement
  AFTER INSERT OR UPDATE OF status ON public.procurement_orders
  FOR EACH ROW EXECUTE FUNCTION sync_project_from_procurement();

COMMENT ON TABLE public.procurement_orders IS 'Supplier BOMs generated after proposal signature. Internal-only — clients never see these.';
COMMENT ON COLUMN public.procurement_orders.status IS 'Workflow: draft → sent → quoted → ordered → received → installed (or cancelled)';
