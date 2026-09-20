-- ============================================================
-- 006_allowlist_rider_job_columns.sql
-- ============================================================

-- restrict_rider_job_columns() in 001 was a denylist: it enumerated the
-- columns a rider must not change. That inverted the safe default — it
-- missed id and created_at, and every column added later would have been
-- writable by riders until someone remembered to extend the list.
--
-- Flip it to an allowlist. Only status, payment_status and delivery_photo_url
-- may differ; anything else, now or in future, raises.
--
-- Scope: this governs WHICH COLUMNS a rider may change when talking to
-- Supabase directly. It does NOT enforce the job lifecycle — legal status
-- transitions, the delivery-photo requirement and the payment_status /
-- cash_remitted pairing live only in backend/src/routes/jobs.js. A rider
-- with a valid token can still write an out-of-order status straight to
-- Supabase after this migration.
--
-- Only the function is replaced; the jobs_rider_column_restrictions trigger
-- from 001 already binds to it by name. That keeps this migration a single
-- CREATE OR REPLACE and therefore safe to apply more than once.

CREATE OR REPLACE FUNCTION restrict_rider_job_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service-role calls (the backend) have no auth.uid(); skip entirely.
  IF auth.uid() IS NULL OR get_my_role() != 'rider' THEN
    RETURN NEW;
  END IF;

  -- updated_at is excluded because the sibling jobs_updated_at trigger
  -- writes it; comparing it would reject every legitimate rider update.
  IF (to_jsonb(OLD) - 'status' - 'payment_status' - 'delivery_photo_url' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(NEW) - 'status' - 'payment_status' - 'delivery_photo_url' - 'updated_at')
  THEN
    RAISE EXCEPTION 'Riders may only update status, payment_status, and delivery_photo_url';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
