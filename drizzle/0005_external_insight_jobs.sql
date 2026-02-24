-- Umfeld-Insights refresh jobs
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_insight_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"triggered_by" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"error" text,
	"result_generated_at" timestamp
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_insight_jobs_project_id_strategy_projects_id_fk') THEN
		ALTER TABLE "external_insight_jobs" ADD CONSTRAINT "external_insight_jobs_project_id_strategy_projects_id_fk"
			FOREIGN KEY ("project_id") REFERENCES "public"."strategy_projects"("id") ON UPDATE NO ACTION ON DELETE CASCADE;
	END IF;
END $$;
