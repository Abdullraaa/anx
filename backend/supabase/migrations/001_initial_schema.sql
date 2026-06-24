-- ============================================================
-- 001_initial_schema.sql
-- ============================================================

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE users (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  phone            text        UNIQUE NOT NULL,
  role             text        NOT NULL CHECK (role IN ('admin', 'rider')),
  expo_push_token  text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE zones (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text  NOT NULL,
  description text
);

CREATE TABLE zone_pricing (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone_id        uuid    REFERENCES zones(id),
  to_zone_id          uuid    REFERENCES zones(id),
  base_price          numeric NOT NULL,
  price_per_extra_kg  numeric DEFAULT 0
);

CREATE TABLE jobs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by           uuid        REFERENCES users(id),
  assigned_rider_id    uuid        REFERENCES users(id),
  pickup_address       text        NOT NULL,
  pickup_lat           numeric,
  pickup_lng           numeric,
  pickup_zone_id       uuid        REFERENCES zones(id),
  dropoff_address      text        NOT NULL,
  dropoff_lat          numeric,
  dropoff_lng          numeric,
  dropoff_zone_id      uuid        REFERENCES zones(id),
  customer_name        text        NOT NULL,
  customer_phone       text        NOT NULL,
  package_description  text,
  delivery_fee         numeric,
  payment_method       text        CHECK (payment_method IN ('cash', 'transfer')),
  payment_status       text        DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed')),
  cash_remitted        boolean     DEFAULT false,
  status               text        DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled')),
  failure_reason       text,
  cancellation_reason  text,
  delivery_photo_url   text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TABLE rider_locations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    uuid        REFERENCES users(id) UNIQUE,
  lat         numeric,
  lng         numeric,
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE payouts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id      uuid        REFERENCES users(id),
  amount        numeric     NOT NULL,
  period_start  date,
  period_end    date,
  notes         text,
  status        text        DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at    timestamptz DEFAULT now()
);


-- ── Trigger: auto-update jobs.updated_at ─────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Helper: current user's role ───────────────────────────
-- SECURITY DEFINER + STABLE lets Postgres cache the result
-- per statement, avoiding a full query per row evaluated.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── Enable RLS ────────────────────────────────────────────

ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts         ENABLE ROW LEVEL SECURITY;


-- ── RLS Policies: users ───────────────────────────────────
-- INSERT / UPDATE intentionally omitted — backend uses service role,
-- which bypasses RLS entirely.

CREATE POLICY "users: read own row"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());


-- ── RLS Policies: zones ───────────────────────────────────

CREATE POLICY "zones: authenticated read"
  ON zones FOR SELECT
  TO authenticated
  USING (true);


-- ── RLS Policies: zone_pricing ────────────────────────────

CREATE POLICY "zone_pricing: authenticated read"
  ON zone_pricing FOR SELECT
  TO authenticated
  USING (true);


-- ── RLS Policies: jobs ────────────────────────────────────

CREATE POLICY "jobs: admins read all"
  ON jobs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "jobs: riders read assigned"
  ON jobs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'rider' AND assigned_rider_id = auth.uid());

CREATE POLICY "jobs: admins insert"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- Riders may update only their assigned jobs.
-- Column-level restriction (status, payment_status, delivery_photo_url only)
-- is enforced by the trigger below.
CREATE POLICY "jobs: riders update assigned"
  ON jobs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'rider' AND assigned_rider_id = auth.uid())
  WITH CHECK (assigned_rider_id = auth.uid());

CREATE POLICY "jobs: admins update all"
  ON jobs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');


-- Trigger to enforce column-level restrictions for rider updates.
-- Riders may only touch: status, payment_status, delivery_photo_url.
-- All other fields must remain unchanged.

CREATE OR REPLACE FUNCTION restrict_rider_job_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role calls have no auth.uid(); skip restriction.
  IF auth.uid() IS NULL OR get_my_role() != 'rider' THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by           IS DISTINCT FROM OLD.created_by
  OR NEW.assigned_rider_id    IS DISTINCT FROM OLD.assigned_rider_id
  OR NEW.pickup_address        IS DISTINCT FROM OLD.pickup_address
  OR NEW.pickup_lat            IS DISTINCT FROM OLD.pickup_lat
  OR NEW.pickup_lng            IS DISTINCT FROM OLD.pickup_lng
  OR NEW.pickup_zone_id        IS DISTINCT FROM OLD.pickup_zone_id
  OR NEW.dropoff_address       IS DISTINCT FROM OLD.dropoff_address
  OR NEW.dropoff_lat           IS DISTINCT FROM OLD.dropoff_lat
  OR NEW.dropoff_lng           IS DISTINCT FROM OLD.dropoff_lng
  OR NEW.dropoff_zone_id       IS DISTINCT FROM OLD.dropoff_zone_id
  OR NEW.customer_name         IS DISTINCT FROM OLD.customer_name
  OR NEW.customer_phone        IS DISTINCT FROM OLD.customer_phone
  OR NEW.package_description   IS DISTINCT FROM OLD.package_description
  OR NEW.delivery_fee          IS DISTINCT FROM OLD.delivery_fee
  OR NEW.payment_method        IS DISTINCT FROM OLD.payment_method
  OR NEW.cash_remitted         IS DISTINCT FROM OLD.cash_remitted
  OR NEW.cancellation_reason   IS DISTINCT FROM OLD.cancellation_reason
  OR NEW.failure_reason        IS DISTINCT FROM OLD.failure_reason
  THEN
    RAISE EXCEPTION 'Riders may only update status, payment_status, and delivery_photo_url';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER jobs_rider_column_restrictions
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION restrict_rider_job_columns();


-- ── RLS Policies: rider_locations ────────────────────────
-- INSERT handled by backend (service role); riders get SELECT + UPDATE only.

CREATE POLICY "rider_locations: admins read all"
  ON rider_locations FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "rider_locations: riders read own"
  ON rider_locations FOR SELECT
  TO authenticated
  USING (get_my_role() = 'rider' AND rider_id = auth.uid());

CREATE POLICY "rider_locations: riders update own"
  ON rider_locations FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'rider' AND rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());


-- ── RLS Policies: payouts ────────────────────────────────

CREATE POLICY "payouts: admins full access"
  ON payouts FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "payouts: riders read own"
  ON payouts FOR SELECT
  TO authenticated
  USING (get_my_role() = 'rider' AND rider_id = auth.uid());
