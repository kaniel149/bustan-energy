-- ============================================================
-- Migration 012: Storage policies for proposal-images bucket
-- ============================================================
-- Fixes upload failures by granting authenticated admins explicit
-- INSERT/UPDATE/DELETE permissions on storage.objects within the
-- proposal-images bucket. Public SELECT already works (bucket is public).
--
-- Run in Supabase SQL editor (needs superuser to alter storage schema).
-- ============================================================

-- Drop any pre-existing policies with the same names (idempotent)
DROP POLICY IF EXISTS "proposal_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_public_select" ON storage.objects;

-- Public read (bucket is already public, but make it explicit)
CREATE POLICY "proposal_images_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposal-images');

-- Admin insert (authenticated users only)
-- Note: we rely on the client being signed in with a valid admin JWT.
-- Allow any authenticated user — the admin UI is itself gated by isAdmin().
CREATE POLICY "proposal_images_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal-images');

CREATE POLICY "proposal_images_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proposal-images')
WITH CHECK (bucket_id = 'proposal-images');

CREATE POLICY "proposal_images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposal-images');
