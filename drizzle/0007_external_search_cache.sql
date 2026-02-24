-- Search cache for Umfeld-Insights (24h TTL per provider/query/lang/region)
CREATE TABLE IF NOT EXISTS "external_search_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"query" text NOT NULL,
	"lang" text NOT NULL,
	"region" text NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_search_cache_provider_query_lang_region_idx" ON "external_search_cache" ("provider","query","lang","region");
