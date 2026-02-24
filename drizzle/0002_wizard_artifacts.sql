-- Drop placeholder table
DROP TABLE IF EXISTS "_placeholder";
--> statement-breakpoint
-- Wizard sessions (phase runs)
CREATE TABLE IF NOT EXISTS "wizard_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phase_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Phase artifacts (versioned, lockable)
CREATE TABLE IF NOT EXISTS "artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" integer NOT NULL,
	"phase_id" text NOT NULL,
	"artifact_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Unique constraint: (sessionId, phaseId, artifactKey, version)
CREATE UNIQUE INDEX IF NOT EXISTS "artifacts_session_phase_key_version_idx" ON "artifacts" ("session_id","phase_id","artifact_key","version");
--> statement-breakpoint
-- Foreign key (idempotent: only add if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'artifacts_session_id_wizard_sessions_id_fk'
  ) THEN
    ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_session_id_wizard_sessions_id_fk"
      FOREIGN KEY ("session_id") REFERENCES "public"."wizard_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
