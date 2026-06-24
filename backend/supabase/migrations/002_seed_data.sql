-- ============================================================
-- 002_seed_data.sql
-- ============================================================

-- ── Zones (Abuja districts) ───────────────────────────────

INSERT INTO zones (name) VALUES
  ('Maitama'),
  ('Asokoro'),
  ('Garki'),
  ('Wuse'),
  ('Wuse 2'),
  ('Utako'),
  ('Jabi'),
  ('Gwarinpa'),
  ('Kubwa'),
  ('Lugbe'),
  ('Lokogoma'),
  ('Apo'),
  ('Nyanya'),
  ('Central Area');


-- ── Zone pricing (all combinations) ──────────────────────
-- Same zone → ₦1,000  |  Different zones → ₦2,000
-- Prices will be updated later with real competitive rates.

INSERT INTO zone_pricing (from_zone_id, to_zone_id, base_price)
SELECT
  z1.id,
  z2.id,
  CASE WHEN z1.id = z2.id THEN 1000 ELSE 2000 END AS base_price
FROM zones z1
CROSS JOIN zones z2;
