-- =====================================================
-- 014_security_hardening.sql
-- FK constraints, unique indexes, CHECK constraints,
-- tightened RLS policies, storage policy hardening.
-- =====================================================

-- ── 1. UNIQUE constraint on proposals.ref_number ─────────
-- (replaces the plain index from migration 009 if not already unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.proposals'::regclass
      AND conname = 'proposals_ref_number_key'
  ) THEN
    ALTER TABLE public.proposals ADD CONSTRAINT proposals_ref_number_key UNIQUE (ref_number);
  END IF;
END$$;

-- Drop the plain non-unique index that migration 009 created (now superseded
-- by the unique constraint above which implicitly creates an index).
DROP INDEX IF EXISTS public.idx_proposals_ref_number;

-- ── 2. FK: proposal_views → proposals ────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_views_proposal'
  ) THEN
    ALTER TABLE public.proposal_views
      ADD CONSTRAINT fk_views_proposal
        FOREIGN KEY (proposal_ref) REFERENCES public.proposals(ref_number) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 3. FK: proposal_signatures → proposals ───────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_signatures_proposal'
  ) THEN
    ALTER TABLE public.proposal_signatures
      ADD CONSTRAINT fk_signatures_proposal
        FOREIGN KEY (proposal_ref) REFERENCES public.proposals(ref_number) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 4. FK: proposal_followups → proposals ────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_followups_proposal'
  ) THEN
    ALTER TABLE public.proposal_followups
      ADD CONSTRAINT fk_followups_proposal
        FOREIGN KEY (proposal_ref) REFERENCES public.proposals(ref_number) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 5. FK: proposal_events → proposals ───────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_proposal'
  ) THEN
    ALTER TABLE public.proposal_events
      ADD CONSTRAINT fk_events_proposal
        FOREIGN KEY (proposal_ref) REFERENCES public.proposals(ref_number) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 6. Partial unique index on proposal_followups ────────
-- Prevents scheduling duplicate pending follow-up of the same type per proposal.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_followup_pending
  ON public.proposal_followups (proposal_ref, followup_type)
  WHERE status = 'pending';

-- ── 7. CHECK constraints on procurement_orders ───────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_panels_positive') THEN
    ALTER TABLE public.procurement_orders ADD CONSTRAINT chk_panels_positive CHECK (panels > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_system_kwp_positive') THEN
    ALTER TABLE public.procurement_orders ADD CONSTRAINT chk_system_kwp_positive CHECK (system_kwp > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_panel_watt_positive') THEN
    ALTER TABLE public.procurement_orders ADD CONSTRAINT chk_panel_watt_positive CHECK (panel_watt > 0);
  END IF;
END $$;

-- ── 8. Tighten RLS on procurement_orders ─────────────────
-- Replace broad "any authenticated user" with energy-tm.com domain check.
DROP POLICY IF EXISTS "admin_read_procurement" ON public.procurement_orders;
CREATE POLICY "admin_read_procurement" ON public.procurement_orders
  FOR SELECT USING (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  );

DROP POLICY IF EXISTS "admin_write_procurement" ON public.procurement_orders;
CREATE POLICY "admin_write_procurement" ON public.procurement_orders
  FOR ALL USING (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  );

-- ── 9. Tighten Storage policies on proposal-images ───────
-- Replace "any authenticated user" with domain-gated writes.
DROP POLICY IF EXISTS "proposal_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_admin_delete" ON storage.objects;

CREATE POLICY "proposal_images_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proposal-images'
  AND (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  )
);

CREATE POLICY "proposal_images_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'proposal-images'
  AND (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  )
)
WITH CHECK (
  bucket_id = 'proposal-images'
  AND (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  )
);

CREATE POLICY "proposal_images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'proposal-images'
  AND (
    (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
    OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
  )
);
