-- Strategy projects: multi-project per user
-- Migration adds strategy_projects table and projectId to wizard_sessions, artifacts, pdf_export_jobs
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add project_id columns (nullable for backfill)
ALTER TABLE "wizard_sessions" ADD COLUMN IF NOT EXISTS "project_id" integer;
--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN IF NOT EXISTS "project_id" integer;
--> statement-breakpoint
ALTER TABLE "pdf_export_jobs" ADD COLUMN IF NOT EXISTS "project_id" integer;
--> statement-breakpoint
-- Backfill: Create default project per user, keep latest session per (user,phase), assign project_id
DO $$
DECLARE
	r RECORD;
	pid integer;
BEGIN
	FOR r IN (SELECT DISTINCT "user_id" FROM (
		SELECT "user_id" FROM "wizard_sessions"
		UNION SELECT "user_id" FROM "artifacts"
		UNION SELECT "user_id" FROM "pdf_export_jobs"
	) u)
	LOOP
		INSERT INTO "strategy_projects" ("user_id", "title", "created_at", "updated_at")
		VALUES (r."user_id", 'Default Strategy', now(), now())
		RETURNING "id" INTO pid;

		-- Delete artifacts for sessions we will drop (keep only latest session per phase)
		DELETE FROM "artifacts" WHERE "session_id" IN (
			SELECT "id" FROM "wizard_sessions" ws
			WHERE ws."user_id" = r."user_id"
			AND ws."id" NOT IN (
				SELECT DISTINCT ON ("phase_id") "id" FROM "wizard_sessions"
				WHERE "user_id" = r."user_id"
				ORDER BY "phase_id", "created_at" DESC
			)
		);

		-- Delete duplicate sessions (keep latest per phase)
		DELETE FROM "wizard_sessions" WHERE "user_id" = r."user_id"
		AND "id" NOT IN (
			SELECT DISTINCT ON ("phase_id") "id" FROM "wizard_sessions"
			WHERE "user_id" = r."user_id"
			ORDER BY "phase_id", "created_at" DESC
		);

		-- Update remaining sessions and artifacts
		UPDATE "wizard_sessions" SET "project_id" = pid WHERE "user_id" = r."user_id";
		UPDATE "artifacts" SET "project_id" = pid WHERE "user_id" = r."user_id";
		UPDATE "pdf_export_jobs" SET "project_id" = pid WHERE "user_id" = r."user_id";
	END LOOP;
END $$;
--> statement-breakpoint
-- Handle any remaining NULLs (e.g. empty tables - no-op)
UPDATE "wizard_sessions" ws SET "project_id" = (SELECT "id" FROM "strategy_projects" sp WHERE sp."user_id" = ws."user_id" LIMIT 1) WHERE ws."project_id" IS NULL;
UPDATE "artifacts" a SET "project_id" = (SELECT ws."project_id" FROM "wizard_sessions" ws WHERE ws."id" = a."session_id" LIMIT 1) WHERE a."project_id" IS NULL;
UPDATE "pdf_export_jobs" p SET "project_id" = (SELECT "id" FROM "strategy_projects" sp WHERE sp."user_id" = p."user_id" LIMIT 1) WHERE p."project_id" IS NULL;
--> statement-breakpoint
-- Make NOT NULL
ALTER TABLE "wizard_sessions" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "artifacts" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "pdf_export_jobs" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
-- Add FK constraints
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wizard_sessions_project_id_strategy_projects_id_fk') THEN
		ALTER TABLE "wizard_sessions" ADD CONSTRAINT "wizard_sessions_project_id_strategy_projects_id_fk"
			FOREIGN KEY ("project_id") REFERENCES "public"."strategy_projects"("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artifacts_project_id_strategy_projects_id_fk') THEN
		ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_project_id_strategy_projects_id_fk"
			FOREIGN KEY ("project_id") REFERENCES "public"."strategy_projects"("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdf_export_jobs_project_id_strategy_projects_id_fk') THEN
		ALTER TABLE "pdf_export_jobs" ADD CONSTRAINT "pdf_export_jobs_project_id_strategy_projects_id_fk"
			FOREIGN KEY ("project_id") REFERENCES "public"."strategy_projects"("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
	END IF;
END $$;
--> statement-breakpoint
-- Unique: one session per project per phase
CREATE UNIQUE INDEX IF NOT EXISTS "wizard_sessions_project_phase_idx" ON "wizard_sessions" ("project_id","phase_id");
