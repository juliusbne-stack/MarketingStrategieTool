-- Add diagnostics column for Umfeld-Insights job debugging
ALTER TABLE "external_insight_jobs" ADD COLUMN IF NOT EXISTS "diagnostics" jsonb;
