/**
 * Wendet die external_search_cache Migrationen manuell an.
 * Run: npx tsx scripts/apply-external-cache-migration.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("Applying external_search_cache migrations...\n");

  // 0007: Create table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "external_search_cache" (
      "id" serial PRIMARY KEY NOT NULL,
      "provider" text NOT NULL,
      "query" text NOT NULL,
      "lang" text NOT NULL,
      "region" text NOT NULL,
      "results" jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "expires_at" timestamp NOT NULL
    )
  `);
  console.log("✓ 0007: Table created");

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "external_search_cache_provider_query_lang_region_idx"
    ON "external_search_cache" ("provider","query","lang","region")
  `);
  console.log("✓ 0007: Unique index created");

  // 0008: Index on expires_at
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "external_search_cache_expires_at_idx"
    ON "external_search_cache" ("expires_at")
  `);
  console.log("✓ 0008: expires_at index created");

  // 0009: fetched_at column
  await db.execute(sql`
    ALTER TABLE "external_search_cache"
    ADD COLUMN IF NOT EXISTS "fetched_at" timestamp DEFAULT now() NOT NULL
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "external_search_cache_fetched_at_idx"
    ON "external_search_cache" ("fetched_at")
  `);
  console.log("✓ 0009: fetched_at column and index created");

  console.log("\nDone. Run 'npm run db:check' to verify.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
