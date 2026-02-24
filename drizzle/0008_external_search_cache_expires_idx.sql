-- Index on expires_at for cleanup queries and TTL enforcement
CREATE INDEX IF NOT EXISTS "external_search_cache_expires_at_idx" ON "external_search_cache" ("expires_at");
