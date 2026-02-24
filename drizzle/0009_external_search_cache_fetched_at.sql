-- Add fetched_at for "newest wins" race protection
ALTER TABLE "external_search_cache" ADD COLUMN IF NOT EXISTS "fetched_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_search_cache_fetched_at_idx" ON "external_search_cache" ("fetched_at");
