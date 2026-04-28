-- Adds the api-rate-limiter key_id to each user row.
--
-- When a user signs up while RATE_LIMITER_URL is configured, the
-- food-backend asks the rate-limiter to provision an API key and stores
-- the returned key_id here. The raw key is shown to the user once and
-- never persisted anywhere.
--
-- Nullable so:
--   - existing users created before this migration aren't broken
--   - users created in non-gateway dev (no RATE_LIMITER_URL) still work
--
-- We intentionally do NOT add a foreign key — the users table lives in
-- Postgres but the rate-limiter stores keys in Redis, so referential
-- integrity has to be maintained at the application layer.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS api_key_id TEXT;

-- Helpful for `SELECT * FROM users WHERE api_key_id = $1` if we ever
-- need to look users up by their gateway identity.
CREATE INDEX IF NOT EXISTS idx_users_api_key_id
    ON users(api_key_id)
    WHERE api_key_id IS NOT NULL;
