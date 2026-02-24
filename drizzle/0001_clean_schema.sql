-- Drop flashcard tables from previous template
DROP TABLE IF EXISTS "cards";
--> statement-breakpoint
DROP TABLE IF EXISTS "decks";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_preferences";
--> statement-breakpoint
-- Placeholder table for clean SaaS template
CREATE TABLE IF NOT EXISTS "_placeholder" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY
);
