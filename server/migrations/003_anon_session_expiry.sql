-- Anonymous session retention
-- Anonymous (unclaimed) sessions are purged a grace period after their
-- scheduling window ends. Expiry is derived, not stored: the cleanup job runs
--   DELETE FROM sessions WHERE owner_id IS NULL AND date_end < CURRENT_DATE - $days
-- This partial index keeps that periodic scan cheap and only covers the
-- anonymous rows it targets (claimed sessions are excluded entirely).

CREATE INDEX IF NOT EXISTS idx_sessions_anon_expiry
  ON sessions (date_end)
  WHERE owner_id IS NULL;
