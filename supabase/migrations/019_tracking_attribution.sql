-- =====================================================
-- 019_tracking_attribution.sql
-- Tracking & attribution stack (ported from Solaris Panama):
--   1. Attribution columns on projects (UTM + click IDs + referrer + CAPI dedup)
--   2. webhook_logs audit table (Meta CAPI / future outbound webhooks)
-- Numbered 019 to stay clear of the concurrent email-drip migration (018).
-- =====================================================

-- 1. Attribution columns on projects (website leads land here)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utm_source        text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utm_medium        text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utm_campaign      text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utm_content       text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utm_term          text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gclid             text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fbclid            text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ttclid            text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referrer_source   text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referrer_url      text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS landing_page      text;
-- Meta CAPI browser/server dedup id (same value passed to fbq eventID)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS event_id          text;
-- Meta click/browser cookies for CAPI matching
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fbc               text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fbp               text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_ip         text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_user_agent text;
-- Full inference trace from api/_lib/attribution.ts (inferAttribution)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS attribution_debug jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_utm_source ON public.projects (utm_source);
CREATE INDEX IF NOT EXISTS idx_projects_gclid ON public.projects (gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_fbclid ON public.projects (fbclid) WHERE fbclid IS NOT NULL;

-- 2. webhook_logs — audit trail for outbound integrations (Meta CAPI, etc.)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,            -- 'capi' | 'enhanced_conv' | ...
  direction   text NOT NULL DEFAULT 'out',
  status_code int,
  payload     jsonb,
  response    jsonb,
  error       text,
  duration_ms int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON public.webhook_logs (source);

-- Service-role only: enable RLS with no policies (anon/authenticated blocked,
-- service role bypasses RLS).
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.webhook_logs IS
  'Outbound webhook audit (Meta CAPI etc). Written by api/_lib/meta-capi.ts via service role.';
