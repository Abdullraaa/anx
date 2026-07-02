-- ============================================================
-- 004_rider_deactivation.sql
-- ============================================================

-- Riders live in the users table (role = 'rider'). Deactivation is a
-- soft flag: an inactive rider keeps their full job / photo / payout
-- history, but is excluded from job assignment. Hard delete is only
-- permitted (in the API layer) for riders with zero job history.

ALTER TABLE users ADD COLUMN is_active boolean NOT NULL DEFAULT true;
