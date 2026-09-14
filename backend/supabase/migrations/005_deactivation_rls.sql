-- ============================================================
-- 005_deactivation_rls.sql
-- ============================================================

-- Deactivation (users.is_active, migration 004) is enforced in the API by
-- requireAuth, but the rider app talks to Supabase directly for delivery
-- photo uploads, and a deactivated rider keeps a valid session until their
-- token expires. These policies close that path so a deactivated rider
-- cannot mutate jobs or upload photos by bypassing the backend.
--
-- No effect on the backend itself: it uses the service role key and
-- bypasses RLS entirely. This is defence in depth for direct clients.

-- Mirrors get_my_role() from 001. Returns NULL when no users row exists,
-- which fails the policies closed.
CREATE OR REPLACE FUNCTION is_my_account_active()
RETURNS boolean AS $$
  SELECT is_active FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── jobs: riders may only advance jobs while active ───────

DROP POLICY IF EXISTS "jobs: riders update assigned" ON jobs;

CREATE POLICY "jobs: riders update assigned"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'rider'
    AND assigned_rider_id = auth.uid()
    AND is_my_account_active()
  )
  WITH CHECK (assigned_rider_id = auth.uid());


-- ── storage: only active accounts may upload delivery photos ──
-- Schema-qualified: this policy is evaluated in the storage schema.

DROP POLICY IF EXISTS "riders upload delivery photos" ON storage.objects;

CREATE POLICY "riders upload delivery photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-photos'
    AND public.is_my_account_active()
  );
