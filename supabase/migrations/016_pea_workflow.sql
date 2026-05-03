-- =====================================================
-- 016_pea_workflow.sql
-- PEA (Provincial Electricity Authority) submission
-- workflow for Bustan Energy solar projects.
--   - PEA tracking columns on projects
--   - pea_documents table + Storage bucket
--   - pea_signatures table
--   - Indexes + RLS policies
-- =====================================================

-- ── 1. PEA tracking columns on projects ──────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_branch text DEFAULT 'Surat Thani';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_authority text DEFAULT 'PEA'
    CHECK (pea_authority IN ('PEA', 'MEA'));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_status text DEFAULT 'not_started'
    CHECK (pea_status IN (
      'not_started',
      'package_ready',
      'submitted',
      'under_review',
      'approved',
      'objected',
      'resubmit_needed',
      'meter_installed',
      'commercial_operation'
    ));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_application_date timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_reference_number text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_meter_inspection_date timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_approval_date timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_rejection_reason text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_documents_url text;

-- Partial index: only index projects actively in the PEA pipeline
CREATE INDEX IF NOT EXISTS idx_projects_pea_status
  ON public.projects (pea_status)
  WHERE pea_status NOT IN ('approved', 'commercial_operation', 'not_started');

-- ── 2. pea_documents table ────────────────────────────

CREATE TABLE IF NOT EXISTS public.pea_documents (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_ref       text,
  document_type      text        NOT NULL CHECK (document_type IN (
    'sld',
    'electrical_plan',
    'layout',
    'specs',
    'application_letter',
    'id_copy',
    'land_deed',
    'equipment_cert',
    'signed_package',
    'approval_letter',
    'other'
  )),
  version            int         NOT NULL DEFAULT 1,
  file_url           text,
  file_hash          text,
  language           text        DEFAULT 'th' CHECK (language IN ('th', 'en', 'both')),
  generated_at       timestamptz DEFAULT now(),
  signed_by_owner    boolean     DEFAULT false,
  signed_by_engineer boolean     DEFAULT false,
  engineer_pe_license text,
  notes              text,
  metadata           jsonb       DEFAULT '{}'::jsonb,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pea_docs_project
  ON public.pea_documents (project_id);

CREATE INDEX IF NOT EXISTS idx_pea_docs_type
  ON public.pea_documents (document_type);

ALTER TABLE public.pea_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pea_documents_service_all" ON public.pea_documents;
CREATE POLICY "pea_documents_service_all" ON public.pea_documents
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "pea_documents_admin_read" ON public.pea_documents;
CREATE POLICY "pea_documents_admin_read" ON public.pea_documents
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pea_documents_admin_write" ON public.pea_documents;
CREATE POLICY "pea_documents_admin_write" ON public.pea_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pea_documents_admin_update" ON public.pea_documents;
CREATE POLICY "pea_documents_admin_update" ON public.pea_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── 3. pea_signatures table ───────────────────────────

CREATE TABLE IF NOT EXISTS public.pea_signatures (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid        NOT NULL REFERENCES public.pea_documents(id) ON DELETE CASCADE,
  signer_role      text        NOT NULL CHECK (signer_role IN ('owner', 'engineer', 'witness')),
  signer_name      text        NOT NULL,
  signer_id_number text,
  signer_pe_license text,
  signature_data   text,
  signed_at        timestamptz DEFAULT now(),
  ip_address       text
);

CREATE INDEX IF NOT EXISTS idx_pea_sigs_document
  ON public.pea_signatures (document_id);

ALTER TABLE public.pea_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pea_sigs_service_all" ON public.pea_signatures;
CREATE POLICY "pea_sigs_service_all" ON public.pea_signatures
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "pea_sigs_admin_read" ON public.pea_signatures;
CREATE POLICY "pea_sigs_admin_read" ON public.pea_signatures
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pea_sigs_admin_write" ON public.pea_signatures;
CREATE POLICY "pea_sigs_admin_write" ON public.pea_signatures
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 4. Storage bucket: pea-documents ─────────────────

INSERT INTO storage.buckets (id, name, public)
  VALUES ('pea-documents', 'pea-documents', false)
  ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "pea_documents_admin_all" ON storage.objects;
CREATE POLICY "pea_documents_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'pea-documents'
    AND (
      (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
      OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
    )
  )
  WITH CHECK (
    bucket_id = 'pea-documents'
    AND (
      (auth.jwt() ->> 'email') LIKE '%@energy-tm.com'
      OR (auth.jwt() ->> 'email') = 'k@kanielt.com'
    )
  );

-- ── Comments ─────────────────────────────────────────

COMMENT ON COLUMN public.projects.pea_branch IS
  'PEA/MEA branch office handling this project, e.g. Surat Thani, Bangkok.';

COMMENT ON COLUMN public.projects.pea_authority IS
  'PEA = Provincial (Ko Phangan, Chiang Mai, Phuket), MEA = Metropolitan (Bangkok).';

COMMENT ON COLUMN public.projects.pea_status IS
  'Lifecycle stage of the PEA grid-connection application.';

COMMENT ON TABLE public.pea_documents IS
  'Generated and uploaded documents for PEA submission package per project.';

COMMENT ON TABLE public.pea_signatures IS
  'Digital signature captures (canvas base64 PNG) for owner and PE engineer.';
