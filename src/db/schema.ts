import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Strategy projects - user can have multiple projects.
 * All wizard data (sessions, artifacts, pdf jobs) belongs to exactly one project.
 */
export const strategyProjectsTable = pgTable("strategy_projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Wizard sessions (phase runs) - one per project per phase.
 * Tracks in_progress vs locked state for versioning.
 */
export const wizardSessionsTable = pgTable(
  "wizard_sessions",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => strategyProjectsTable.id),
    userId: text("user_id").notNull(),
    phaseId: text("phase_id").notNull(),
    status: text("status").notNull(), // "in_progress" | "locked"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("wizard_sessions_project_phase_idx").on(
      table.projectId,
      table.phaseId
    ),
  ]
);

/**
 * Phase artifacts - versioned, lockable outputs per session.
 * data holds the artifact JSON per phase1.artifacts.json schema.
 */
export const artifactsTable = pgTable(
  "artifacts",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => strategyProjectsTable.id),
    userId: text("user_id").notNull(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => wizardSessionsTable.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").notNull(),
    artifactKey: text("artifact_key").notNull(), // e.g. "swot", "pestel"
    version: integer("version").notNull().default(1),
    locked: boolean("locked").notNull().default(false),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("artifacts_session_phase_key_version_idx").on(
      table.sessionId,
      table.phaseId,
      table.artifactKey,
      table.version
    ),
  ]
);

/**
 * PDF export jobs - tracks export runs per project.
 * v1: synchronous; status defaults to "completed".
 */
export const pdfExportJobsTable = pgTable("pdf_export_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => strategyProjectsTable.id),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").notNull().default("completed"), // "completed" | "failed"
  fileUrl: text("file_url"),
  error: text("error"),
  meta: jsonb("meta"), // e.g. project title, view mode
});

/**
 * Search cache for Umfeld-Insights (24h TTL).
 * Unique per (provider, query, lang, region).
 */
export const externalSearchCacheTable = pgTable(
  "external_search_cache",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    query: text("query").notNull(),
    lang: text("lang").notNull(),
    region: text("region").notNull(),
    results: jsonb("results").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("external_search_cache_provider_query_lang_region_idx").on(
      table.provider,
      table.query,
      table.lang,
      table.region
    ),
  ]
);

/**
 * Umfeld-Insights (External Drivers) refresh jobs.
 * Rate limit: manual refresh max 1 per 24h (enforced via last job startedAt).
 * diagnostics: providerName, queriesCount, rawResultsCount, whitelistKeptCount,
 *   verifiedCount, gptSourcesUsedCount, driversKeptCount, errorStage ("search"|"verify"|"gpt"|"persist"),
 *   usedCache, cacheHits, cacheMisses, maxQueriesApplied, numResultsApplied, englishQueriesEnabled
 */
export const externalInsightJobsTable = pgTable("external_insight_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => strategyProjectsTable.id),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // "queued" | "running" | "success" | "failed"
  triggeredBy: text("triggered_by").notNull(), // "manual" | "auto"
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  error: text("error"),
  resultGeneratedAt: timestamp("result_generated_at"),
  diagnostics: jsonb("diagnostics"), // { providerName, queriesCount, rawResultsCount, ... }
});
