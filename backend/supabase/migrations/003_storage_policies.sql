-- ============================================================
-- 003_storage_policies.sql
-- ============================================================

-- ── Storage RLS: delivery photos ─────────────────────────
-- Riders upload a delivery photo (via the rider app, using their own
-- authenticated session) when marking a job delivered. Allow any
-- authenticated user to INSERT objects into the delivery-photos bucket.
-- The bucket is public-read, so no SELECT policy is required here.

create policy "riders upload delivery photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-photos');
