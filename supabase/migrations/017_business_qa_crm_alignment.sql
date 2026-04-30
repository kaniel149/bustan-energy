-- =====================================================
-- 017_business_qa_crm_alignment.sql
-- Align CRM pipeline with real TM Energy EPC/PPA operations.
-- =====================================================

-- Canonical stage order:
-- lead -> survey -> electricity_analysis -> design -> proposal -> contract
-- -> procurement -> pea -> installation -> om

UPDATE public.projects
SET status = 'survey', step_number = 2
WHERE status = 'evaluation';

UPDATE public.projects
SET status = 'proposal', step_number = 5
WHERE status = 'survey_approval';

UPDATE public.projects
SET step_number = CASE status
  WHEN 'lead' THEN 1
  WHEN 'survey' THEN 2
  WHEN 'electricity_analysis' THEN 3
  WHEN 'design' THEN 4
  WHEN 'proposal' THEN 5
  WHEN 'contract' THEN 6
  WHEN 'procurement' THEN 7
  WHEN 'pea' THEN 8
  WHEN 'installation' THEN 9
  WHEN 'om' THEN 10
  ELSE step_number
END
WHERE status IN ('lead','survey','electricity_analysis','design','proposal','contract','procurement','pea','installation','om');

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pea_customer_number text,
  ADD COLUMN IF NOT EXISTS pea_meter_number text,
  ADD COLUMN IF NOT EXISTS tariff_class text,
  ADD COLUMN IF NOT EXISTS bill_url text,
  ADD COLUMN IF NOT EXISTS twelve_month_usage_kwh jsonb,
  ADD COLUMN IF NOT EXISTS main_breaker_amp numeric,
  ADD COLUMN IF NOT EXISTS transformer_notes text,
  ADD COLUMN IF NOT EXISTS selected_proposal_ref text,
  ADD COLUMN IF NOT EXISTS selected_option text,
  ADD COLUMN IF NOT EXISTS deposit_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS installation_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS om_contract_ref text;

COMMENT ON COLUMN public.projects.tariff_class IS 'PEA tariff class from bill, e.g. residential, small business, medium business, TOU.';
COMMENT ON COLUMN public.projects.twelve_month_usage_kwh IS 'Optional monthly kWh profile used for electricity analysis and proposal sizing.';
