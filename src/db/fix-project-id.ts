/**
 * Fix: Add project_id to wizard_sessions (and related tables) if missing.
 * Run when migration 0004 was not applied: npx tsx src/db/fix-project-id.ts
 */
import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  console.log("Adding project_id to wizard_sessions if missing...");

  // 1. Create strategy_projects if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "strategy_projects" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "title" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log("  strategy_projects OK");

  // 2. Add project_id to wizard_sessions
  await db.execute(sql`
    ALTER TABLE "wizard_sessions" ADD COLUMN IF NOT EXISTS "project_id" integer
  `);
  console.log("  wizard_sessions.project_id added");

  // 3. Add project_id to artifacts if table exists
  try {
    await db.execute(sql`
      ALTER TABLE "artifacts" ADD COLUMN IF NOT EXISTS "project_id" integer
    `);
    console.log("  artifacts.project_id added");
  } catch {
    console.log("  artifacts table skip (may not exist)");
  }

  // 4. Add project_id to pdf_export_jobs if table exists
  try {
    await db.execute(sql`
      ALTER TABLE "pdf_export_jobs" ADD COLUMN IF NOT EXISTS "project_id" integer
    `);
    console.log("  pdf_export_jobs.project_id added");
  } catch {
    console.log("  pdf_export_jobs table skip (may not exist)");
  }

  // 5. Backfill: create default project per user (or use existing) and assign project_id
  await db.execute(sql`
    DO $$
    DECLARE r RECORD; pid integer;
    BEGIN
      FOR r IN (SELECT DISTINCT "user_id" FROM "wizard_sessions")
      LOOP
        SELECT "id" INTO pid FROM "strategy_projects" WHERE "user_id" = r."user_id" LIMIT 1;
        IF pid IS NULL THEN
          INSERT INTO "strategy_projects" ("user_id", "title", "created_at", "updated_at")
          VALUES (r."user_id", 'Default Strategy', now(), now())
          RETURNING "id" INTO pid;
        END IF;
        UPDATE "wizard_sessions" SET "project_id" = pid WHERE "user_id" = r."user_id";
      END LOOP;
    END $$
  `);
  console.log("  Backfill wizard_sessions OK");

  // 6. Backfill artifacts
  try {
    await db.execute(sql`
      UPDATE "artifacts" a SET "project_id" = (
        SELECT ws."project_id" FROM "wizard_sessions" ws WHERE ws."id" = a."session_id" LIMIT 1
      ) WHERE a."project_id" IS NULL
    `);
    console.log("  Backfill artifacts OK");
  } catch {
    /* ignore */
  }

  // 7. Backfill pdf_export_jobs
  try {
    await db.execute(sql`
      UPDATE "pdf_export_jobs" p SET "project_id" = (
        SELECT "id" FROM "strategy_projects" sp WHERE sp."user_id" = p."user_id" LIMIT 1
      ) WHERE p."project_id" IS NULL
    `);
    console.log("  Backfill pdf_export_jobs OK");
  } catch {
    /* ignore */
  }

  // 8. Set NOT NULL
  await db.execute(sql`ALTER TABLE "wizard_sessions" ALTER COLUMN "project_id" SET NOT NULL`);
  console.log("  wizard_sessions.project_id NOT NULL");

  try {
    await db.execute(sql`ALTER TABLE "artifacts" ALTER COLUMN "project_id" SET NOT NULL`);
  } catch {
    /* may have no rows or already set */
  }
  try {
    await db.execute(sql`ALTER TABLE "pdf_export_jobs" ALTER COLUMN "project_id" SET NOT NULL`);
  } catch {
    /* may have no rows or already set */
  }

  // 9. Add FK if not exists
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wizard_sessions_project_id_strategy_projects_id_fk') THEN
        ALTER TABLE "wizard_sessions" ADD CONSTRAINT "wizard_sessions_project_id_strategy_projects_id_fk"
          FOREIGN KEY ("project_id") REFERENCES "public"."strategy_projects"("id");
      END IF;
    END $$
  `);
  console.log("  FK wizard_sessions OK");

  // 10. Remove duplicate sessions (keep latest per project+phase), then add unique index
  await db.execute(sql`
    DELETE FROM "wizard_sessions" ws
    WHERE ws."id" NOT IN (
      SELECT DISTINCT ON ("project_id", "phase_id") "id"
      FROM "wizard_sessions"
      ORDER BY "project_id", "phase_id", "created_at" DESC
    )
  `);
  console.log("  Duplicates removed");

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "wizard_sessions_project_phase_idx"
    ON "wizard_sessions" ("project_id","phase_id")
  `);
  console.log("  Unique index OK");

  console.log("\nDone! Try opening the project again.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
