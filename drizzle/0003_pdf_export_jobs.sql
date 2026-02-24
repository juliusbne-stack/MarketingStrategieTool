-- PDF export jobs (v1: synchronous)
CREATE TABLE IF NOT EXISTS "pdf_export_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"file_url" text,
	"error" text,
	"meta" jsonb
);
