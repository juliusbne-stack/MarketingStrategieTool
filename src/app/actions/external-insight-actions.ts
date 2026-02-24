"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artifactsTable,
  externalInsightJobsTable,
  strategyProjectsTable,
  wizardSessionsTable,
} from "@/db/schema";
import { assertProjectOwnership } from "@/lib/server/project-ownership";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import {
  getSearchProvider,
  getSearchProviderName,
  getFallbackProvider,
  getFallbackProviderName,
  isSearchConfigured,
  isSearchNotConfiguredError,
  getEnvStatusDiagnostics,
  SEARCH_NOT_CONFIGURED,
  type SearchResult,
  type SearchRequestDiagnostics,
} from "@/lib/server/search-provider";
import { searchWithCache } from "@/lib/server/search-cache";
import { extractPublishedAtFromUrl, normalizeDateToYyyyMmDd } from "@/lib/server/extract-published-at";
import {
  getDomainFromUrl,
  isDomainWhitelisted,
  type ExternalDriversArtifact,
  type ExternalDriverSource,
} from "@/lib/server/external-drivers-types";
import { getDomainRule } from "@/lib/server/domain-registry";
import { clusterSources } from "@/lib/server/source-clustering";
import {
  verifyUrl,
  filterVerifiedSourcesInPestelArtifact,
} from "@/lib/server/verify-url";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateObject, generateText, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { Porter5ForcesSchema } from "@/lib/validations/phase1-artifacts";

const RATE_LIMIT_HOURS = 24;
const PROD_MAX_DE_QUERIES = 27;
const PROD_MAX_EN_QUERIES = 8;
const PROD_MAX_RAW_RESULTS = 80;
const PROD_NUM_RESULTS_PER_QUERY = 12;
const DEV_MAX_QUERIES = 4;
const DEV_NUM_RESULTS_PER_QUERY = 5;
const MAX_DOMAIN_CAP = 3;
const MAX_VERIFIED_FOR_GPT = 30;
const MAX_DRIVERS_PER_CATEGORY = 3;
const MAX_TOTAL_DRIVERS = 9;
const MAX_CATEGORIES = 6;
const MIN_SOURCES_PER_DRIVER = 2;
const MIN_DOMAINS_PER_DRIVER = 2;

const RefreshSchema = z.object({
  projectId: z.number().int().positive(),
  /** Bypass rate limit + cache = echte Suchanfragen */
  force: z.boolean().optional().default(false),
  /** Nur Rate-Limit umgehen, Cache nutzen = keine unnötigen Suchanfragen wenn Ergebnisse existieren */
  bypassRateLimitOnly: z.boolean().optional().default(false),
  /** Nur PESTEL, nur Porter oder beide aktualisieren. Bei partiell: Cache nutzen, bestehende Artefakte als Kontext */
  refreshOnly: z.enum(["pestel", "porter", "both"]).optional().default("both"),
});

/** Parse provider error into structured ExternalSearchError */
function parseSearchError(
  err: unknown,
  providerName: string
): ExternalSearchError {
  const msg = err instanceof Error ? err.message : String(err);
  const statusMatch = msg.match(/(?:failed|error|status)[:\s]+(\d{3})/i) ?? msg.match(/\b(\d{3})\b/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
  const isAuthError =
    statusCode === 401 ||
    statusCode === 403 ||
    msg.includes("SERPAPI_UNAUTHORIZED") ||
    msg.includes("SERPER_UNAUTHORIZED");
  const provider = providerName === "serper" ? "serper" : providerName === "brave" ? "brave" : providerName === "serpapi" ? "serpapi" : providerName;
  return {
    provider,
    statusCode,
    message: msg,
    isAuthError,
  };
}

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.searchParams.forEach((_, key) => {
      if (
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].includes(key)
      ) {
        u.searchParams.delete(key);
      }
    });
    return u.toString();
  } catch {
    return url;
  }
}

/** Build search queries from strategy_profile */
function buildQueriesFromStrategyProfile(
  profile: Record<string, unknown>
): { de: string[]; en: string[] } {
  const de: string[] = [];
  const en: string[] = [];

  const summary = profile.summary as Record<string, unknown> | undefined;
  const inputsEcho = profile.inputs_echo as Record<string, unknown> | undefined;
  const market = profile.market as Record<string, unknown> | undefined;
  const targetGroup = profile.target_group as Record<string, unknown> | undefined;

  const oneLiner = String(summary?.one_liner ?? "").trim();
  const geo = String(inputsEcho?.geo_market ?? "").trim();
  const offerType = String(inputsEcho?.offer_type ?? "").trim();
  const offerScope = String(inputsEcho?.offer_scope ?? "").trim();
  const buyerType = String(inputsEcho?.buyer_type ?? "").trim();
  const stage = String(market?.stage ?? "").trim();
  const keyTrends = (market?.key_trends as string[]) ?? [];
  const primaryLabel = String(targetGroup?.primary_label ?? "").trim();

  const baseTerms = [oneLiner, geo, offerType, offerScope, primaryLabel]
    .filter(Boolean)
    .slice(0, 4);

  const trendTerms = keyTrends.slice(0, 3);
  const combined = [...new Set([...baseTerms, ...trendTerms])].filter(Boolean);
  const year = new Date().getFullYear();

  if (combined.length === 0) {
    de.push(`Deutschland Wirtschaft Trends ${year}`);
    de.push("Marktentwicklung Deutschland");
  }

  combined.forEach((t) => {
    if (t.length > 2) {
      de.push(`${t} Deutschland Entwicklung ${year}`);
      de.push(`${t} Markt Trends`);
    }
  });

  de.push(`Regulierung Deutschland Branche ${year}`);
  de.push("Technologie Trends Deutschland");
  if (geo && geo.toLowerCase().includes("eu")) {
    de.push(`EU Regulierung ${year}`);
  }

  // PESTEL-Kategorien Ökologie, Legal, Politik – systematisch berücksichtigen
  const catTerm = combined[0] || offerType || "Branche";
  de.push(`${catTerm} Umwelt Nachhaltigkeit Deutschland ${year}`);
  de.push(`Rechtliche Regulierung ${catTerm} Deutschland ${year}`);
  de.push(`Politische Entwicklung ${catTerm} Deutschland ${year}`);

  // Porter Five Forces – Wettbewerb, Marktstruktur, Barrieren, Kunden, Lieferanten, Substitute
  const industryTerm = oneLiner || offerType || catTerm;
  de.push(`${industryTerm} Wettbewerber Marktanteile Deutschland ${year}`);
  de.push(`${industryTerm} Marktkonzentration Wettbewerbsintensität`);
  de.push(`${industryTerm} Markteintrittsbarrieren Branche`);
  de.push(`${industryTerm} neue Marktteilnehmer Bedrohung Wettbewerb ${year}`);
  de.push(`${industryTerm} Lieferanten Marktmacht Konzentration`);
  de.push(`${industryTerm} Kundenmacht Abnehmermacht Branche`);
  de.push(`${industryTerm} Ersatzprodukte Substitute Alternativen`);
  de.push(`${industryTerm} alternative Lösung Substitute`);
  de.push(`${industryTerm} Software Automatisierung Plattform`);
  de.push(`${industryTerm} inhouse build vs buy`);
  de.push(`${industryTerm} Outsourcing Nearshore neue Anbieter`);
  de.push(`${industryTerm} Marktwachstum Überkapazitäten`);
  de.push(`${industryTerm} Wechselkosten Kundenbindung`);

  const uniqueDe = [...new Set(de)].slice(0, PROD_MAX_DE_QUERIES);

  const isTechOrIndustry =
    offerType.toLowerCase().includes("tech") ||
    offerType.toLowerCase().includes("software") ||
    offerType.toLowerCase().includes("saas") ||
    stage === "emerging";

  if (isTechOrIndustry) {
    en.push(`${offerType} market trends ${year}`);
    en.push(`${offerType} industry outlook`);
    en.push(`global technology trends ${year}`);
  }

  // Porter Five Forces – English (industry structure, competitors, barriers)
  const industryEn = offerType || oneLiner || "industry";
  en.push(`${industryEn} competitors market share ${year}`);
  en.push(`${industryEn} barriers to entry`);
  en.push(`${industryEn} buyer power supplier power`);
  en.push(`${industryEn} substitutes alternatives`);

  const uniqueEn = [...new Set(en)].slice(0, PROD_MAX_EN_QUERIES);

  return { de: uniqueDe, en: uniqueEn };
}

/** Umfeld-Insights GPT extraction schema – jsonSchema statt Zod: OpenAI verlangt additionalProperties: false für Structured Outputs */
const umfeldInsightJsonSchema = jsonSchema<{
  categories: Array<{
    id: string;
    title: string;
    relevance: "high" | "medium" | "low";
    drivers: Array<{
      title: string;
      summary: string;
      extendedSummary: string;
      impact: 1 | 2 | 3 | 4 | 5;
      horizon: "now" | "3-12m" | "12m+";
      direction: "chance" | "risk" | "neutral";
      tags: string[];
      sourceUrls: string[];
      relevanceReason: string;
      strategicImplication: string;
    }>;
  }>;
}>({
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          relevance: { type: "string", enum: ["high", "medium", "low"] },
          drivers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                extendedSummary: { type: "string", minLength: 80 },
                impact: { type: "integer", minimum: 1, maximum: 5 },
                horizon: { type: "string", enum: ["now", "3-12m", "12m+"] },
                direction: { type: "string", enum: ["chance", "risk", "neutral"] },
                tags: { type: "array", items: { type: "string" } },
                sourceUrls: { type: "array", items: { type: "string" } },
                relevanceReason: { type: "string" },
                strategicImplication: { type: "string" },
                entityLinks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, url: { type: "string" } },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "title",
                "summary",
                "extendedSummary",
                "impact",
                "horizon",
                "direction",
                "tags",
                "sourceUrls",
                "relevanceReason",
                "strategicImplication",
              ],
              additionalProperties: false,
            },
            maxItems: MAX_DRIVERS_PER_CATEGORY,
          },
        },
        required: ["id", "title", "relevance", "drivers"],
        additionalProperties: false,
      },
    },
  },
  required: ["categories"],
  additionalProperties: false,
});

/** Structured error when external search provider (Serper/Brave) fails */
export type ExternalSearchError = {
  provider: string;
  statusCode?: number;
  message: string;
  isAuthError?: boolean;
};

export type ExternalSearchStatus = "ok" | "error";

export type EnvStatusDiagnostics = {
  searchProviderSet: boolean;
  apiKeyPresent: boolean;
  apiKeyLength: number;
  endpointUsed: string;
  providerName: string;
  runtime: "node" | "edge" | "unknown";
};

export type JobDiagnostics = {
  providerName?: string;
  queriesCount?: number;
  rawResultsCount?: number;
  whitelistKeptCount?: number;
  verifiedCount?: number;
  gptSourcesUsedCount?: number;
  driversKeptCount?: number;
  errorStage?: "search" | "verify" | "gpt" | "persist";
  usedCache?: boolean;
  cacheHits?: number;
  cacheMisses?: number;
  maxQueriesApplied?: number;
  numResultsApplied?: number;
  englishQueriesEnabled?: boolean;
  forceApplied?: boolean;
  bypassRateLimitOnly?: boolean;
  refreshOnly?: "pestel" | "porter" | "both";
  keyNormalizationApplied?: boolean;
  defaultsApplied?: { langDefaulted?: boolean; regionDefaulted?: boolean };
  inFlightDeduped?: number;
  cacheWriteSkippedDueToNewer?: number;
  latestFetchedAtUsed?: string;
  /** Cache write failed (shortened); pipeline continued, results used */
  cacheWriteError?: string;
  externalSearchError?: ExternalSearchError;
  fallbackUsed?: boolean;
  fallbackProvider?: string;
  /** Dev only: ENV availability at runtime */
  envStatus?: EnvStatusDiagnostics;
  /** Trust-policy diagnostics */
  rawOrganicCount?: number;
  rawNewsCount?: number;
  datedKeptCount?: number;
  minSourcesRequired?: number;
  driversDroppedNoDate?: number;
  driversDroppedTooFewSources?: number;
  driversDroppedNotEnoughDomains?: number;
  driversDroppedMissingImplication?: number;
  sourcesDroppedNoDate?: number;
  /** Count of sources from non-whitelisted domains (included, not dropped) */
  unclassifiedSourcesCount?: number;
  /** Year distribution of dated sources (e.g. {"2025":3,"2024":5}) */
  sourcesByYear?: Record<string, number>;
  /** Number of clusters passed to GPT; 1 = fallback mode */
  clusterCount?: number;
  /** Driver counts by confidence tier */
  driversByConfidence?: { high: number; medium: number; low: number };
  sourcesKeptByType?: Record<string, number>;
  sourcesKeptByTier?: Record<string, number>;
  /** Porter Five Forces aus Suchquellen extrahiert und persistiert */
  porterForcesPersisted?: boolean;
  porterForcesSkipped?: string;
  minDomainsRequired?: number;
  sourcesDroppedNotVerified?: number;
  /** Partial success: some queries failed but totalResults > 0 */
  partialSearch?: boolean;
  /** SerpApi: search request diagnostics (totalTookMs, retriesCount, timeoutsCount, perRequest) */
  search?: SearchRequestDiagnostics;
};

const isDev = process.env.NODE_ENV === "development";

const SERPAPI_MAX_CONCURRENT = 2;

/** Run tasks with max concurrency. Never throws - errors are returned in outcome. */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<Array<{ result?: T; error?: unknown }>> {
  const outcomes: { result?: T; error?: unknown }[] = new Array(tasks.length);
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < tasks.length) {
      const i = idx++;
      const fn = tasks[i];
      if (!fn) continue;
      try {
        outcomes[i] = { result: await fn() };
      } catch (e) {
        outcomes[i] = { error: e };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return outcomes;
}

export async function refreshExternalDrivers(
  input: z.input<typeof RefreshSchema>,
  /** Dev only: bypass auth when calling from script */
  internalOverride?: { userId: string }
) {
  const validated = RefreshSchema.parse(input);
  const userId =
    isDev && internalOverride
      ? internalOverride.userId
      : (await assertProjectOwnership(validated.projectId)).userId;

  if (!isSearchConfigured()) {
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
    return { success: false, error: SEARCH_NOT_CONFIGURED };
  }

  const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;
  const skipRateLimit = isDev && (validated.force || validated.bypassRateLimitOnly);
  /** Bei force: Cache umgehen. Sonst Cache nutzen (auch bei partiell refreshOnly). */
  const searchForce = validated.force;

  if (!skipRateLimit) {
    const [lastManualJob] = await db
      .select()
      .from(externalInsightJobsTable)
      .where(
        and(
          eq(externalInsightJobsTable.projectId, validated.projectId),
          eq(externalInsightJobsTable.triggeredBy, "manual")
        )
      )
      .orderBy(desc(externalInsightJobsTable.startedAt))
      .limit(1);

    if (lastManualJob) {
      const elapsed = Date.now() - new Date(lastManualJob.startedAt).getTime();
      if (elapsed < RATE_LIMIT_MS) {
        const remainingH = Math.ceil(
          (RATE_LIMIT_MS - elapsed) / (60 * 60 * 1000)
        );
        throw new Error(`Nächste Aktualisierung in ${remainingH}h möglich.`);
      }
    }
  }

  const providerName = getSearchProviderName() ?? "unknown";

  const [job] = await db
    .insert(externalInsightJobsTable)
    .values({
      projectId: validated.projectId,
      userId,
      status: "running",
      triggeredBy: "manual",
      diagnostics: { providerName, queriesCount: 0 },
    })
    .returning();

  if (!job) throw new Error("Failed to create job");

  const diagnostics: JobDiagnostics = { providerName };
  if (isDev) {
    diagnostics.envStatus = getEnvStatusDiagnostics();
  }

  try {
    const session = await getOrCreatePhase1Session(
      validated.projectId,
      internalOverride?.userId
    );
    const artifacts = await listLatestPhase1Artifacts(
      validated.projectId,
      session.id,
      internalOverride?.userId
    );
    const strategyProfileArtifact = artifacts.find(
      (a) => a.artifactKey === "strategy_profile"
    );
    const strategyProfile = strategyProfileArtifact?.data as
      | Record<string, unknown>
      | undefined;

    if (!strategyProfile || typeof strategyProfile !== "object") {
      throw new Error("Strategy profile not found. Complete Phase 1 first.");
    }

    const { de: deRaw, en: enRaw } =
      buildQueriesFromStrategyProfile(strategyProfile);

    const maxQueries = isDev ? DEV_MAX_QUERIES : PROD_MAX_DE_QUERIES + PROD_MAX_EN_QUERIES;
    const numResultsPerQuery = isDev
      ? DEV_NUM_RESULTS_PER_QUERY
      : PROD_NUM_RESULTS_PER_QUERY;
    const englishQueriesEnabled = !isDev;

    const deQueries = deRaw.slice(0, isDev ? DEV_MAX_QUERIES : PROD_MAX_DE_QUERIES);
    const enQueries = englishQueriesEnabled
      ? enRaw.slice(0, PROD_MAX_EN_QUERIES)
      : [];

    diagnostics.maxQueriesApplied = maxQueries;
    diagnostics.numResultsApplied = numResultsPerQuery;
    diagnostics.englishQueriesEnabled = englishQueriesEnabled;
    diagnostics.queriesCount = deQueries.length + enQueries.length;

    const searchProvider = getSearchProvider();
    let cacheHits = 0;
    let cacheMisses = 0;
    let inFlightDeduped = 0;
    let cacheWriteSkippedDueToNewer = 0;
    let latestFetchedAt: Date | undefined;
    let anyLangDefaulted = false;
    let anyRegionDefaulted = false;
    let firstCacheWriteError: string | undefined;
    const searchDiagnosticsAll: SearchRequestDiagnostics[] = [];

    diagnostics.forceApplied = validated.force;
    diagnostics.bypassRateLimitOnly = validated.bypassRateLimitOnly;
    diagnostics.refreshOnly = validated.refreshOnly;

    /** Kontext aus allen Situationsanalyse-Artefakten für GPT – alle relevanten Infos nutzen */
    const situationsanalyseContext = (() => {
      const ctx: Record<string, unknown> = {};
      /** Originalantworten aus dem Fragebogen – wichtige Nutzerangaben */
      const phase1Answers = artifacts.find((a) => a.artifactKey === "phase1_answers")?.data;
      if (phase1Answers && typeof phase1Answers === "object") ctx.fragebogen_antworten = phase1Answers;
      const sp = artifacts.find((a) => a.artifactKey === "strategy_profile")?.data;
      if (sp && typeof sp === "object") ctx.strategy_profile = sp;
      const pestel = artifacts.find((a) => a.artifactKey === "pestel")?.data;
      if (pestel && typeof pestel === "object") ctx.umfeld_insights = pestel;
      /** Porter NICHT mitgeben, wenn wir Porter neu generieren – sonst kopiert das Modell das alte Kurzfazit */
      const isPorterRefresh = validated.refreshOnly === "porter" || validated.refreshOnly === "both";
      const porter = !isPorterRefresh
        ? artifacts.find((a) => a.artifactKey === "porter_5_forces")?.data
        : undefined;
      if (porter && typeof porter === "object") ctx.porter = porter;
      const swot = artifacts.find((a) => a.artifactKey === "swot")?.data;
      if (swot && typeof swot === "object") ctx.swot = swot;
      const groupMap = artifacts.find((a) => a.artifactKey === "strategic_group_map")?.data;
      if (groupMap && typeof groupMap === "object") ctx.strategic_group_map = groupMap;
      const seg = artifacts.find((a) => a.artifactKey === "market_segmentation")?.data;
      if (seg && typeof seg === "object") ctx.market_segmentation = seg;
      const targets = artifacts.find((a) => a.artifactKey === "target_profiles")?.data;
      if (targets && typeof targets === "object") ctx.target_profiles = targets;
      return ctx;
    })();
    diagnostics.keyNormalizationApplied = true;

    type QuerySpec = { query: string; lang: "de" | "en"; region: "DE" | "GLOBAL" };
    const allQuerySpecs: QuerySpec[] = [
      ...deQueries.map((q) => ({ query: q, lang: "de" as const, region: "DE" as const })),
      ...enQueries.map((q) => ({ query: q, lang: "en" as const, region: "GLOBAL" as const })),
    ];

    const useConcurrency = providerName === "serpapi" ? SERPAPI_MAX_CONCURRENT : 1;
    const tasks = allQuerySpecs.map((spec) => async () => {
      const diagnosticsRef = providerName === "serpapi" ? { current: {} as SearchRequestDiagnostics } : undefined;
      const r = await searchWithCache({
        provider: providerName,
        query: spec.query,
        lang: spec.lang,
        region: spec.region,
        force: searchForce,
        searchFn: () =>
          searchProvider.searchWeb(spec.query, {
            lang: spec.lang,
            region: spec.region,
            numResults: numResultsPerQuery,
            force: searchForce,
            diagnosticsRef,
          }),
      });
      return { ...r, diagnosticsRef };
    });

    const outcomes = await runWithConcurrency(tasks, useConcurrency);

    let allResults: SearchResult[] = [];
    const queryErrors: unknown[] = [];
    for (let i = 0; i < outcomes.length; i++) {
      const o = outcomes[i];
      const spec = allQuerySpecs[i];
      if (o.error) {
        queryErrors.push(o.error);
        continue;
      }
      const r = o.result;
      if (!r) continue;
      if (r.fromCache) cacheHits++;
      else if (r.inFlightDeduped) inFlightDeduped++;
      else cacheMisses++;
      if (r.cacheWriteSkippedDueToNewer) cacheWriteSkippedDueToNewer++;
      if (r.latestFetchedAtUsed && (!latestFetchedAt || r.latestFetchedAtUsed > latestFetchedAt)) {
        latestFetchedAt = r.latestFetchedAtUsed;
      }
      if (r.defaultsApplied.langDefaulted) anyLangDefaulted = true;
      if (r.defaultsApplied.regionDefaulted) anyRegionDefaulted = true;
      if (r.cacheWriteError && !firstCacheWriteError) firstCacheWriteError = r.cacheWriteError;
      allResults.push(...r.results);
      const diag = r.diagnosticsRef?.current;
      if (diag) searchDiagnosticsAll.push(diag);
    }

    const hasAuthError = queryErrors.some((e) => parseSearchError(e, providerName).isAuthError);
    const firstError = queryErrors[0];
    const externalSearchError = firstError ? parseSearchError(firstError, providerName) : undefined;
    const anyQueryFailed = queryErrors.length > 0;

    if (searchDiagnosticsAll.length > 0) {
      diagnostics.search = {
        totalTookMs: searchDiagnosticsAll.reduce((s, d) => s + d.totalTookMs, 0),
        retriesCount: searchDiagnosticsAll.reduce((s, d) => s + d.retriesCount, 0),
        timeoutsCount: searchDiagnosticsAll.reduce((s, d) => s + d.timeoutsCount, 0),
        perRequest: searchDiagnosticsAll.flatMap((d) => d.perRequest),
      };
    }

    if (hasAuthError && externalSearchError) {
      diagnostics.externalSearchError = externalSearchError;
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: externalSearchError.message,
          diagnostics: { ...diagnostics, errorStage: "search" },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return {
        success: false,
        error: isDev ? externalSearchError.message : "Externe Umfeldsuche fehlgeschlagen.",
        externalSearchStatus: "error" as const,
        externalSearchError,
        diagnostics,
      };
    }

    if (allResults.length === 0 && anyQueryFailed && externalSearchError) {
      const fallbackProvider = getFallbackProvider();
      const fallbackName = getFallbackProviderName();
      if (fallbackProvider && fallbackName) {
        try {
          allResults = [];
          cacheHits = 0;
          cacheMisses = 0;
          inFlightDeduped = 0;
          firstCacheWriteError = undefined;
          for (const spec of allQuerySpecs) {
            const r = await searchWithCache({
              provider: fallbackName,
              query: spec.query,
              lang: spec.lang,
              region: spec.region,
              force: searchForce,
              searchFn: () =>
                fallbackProvider.searchWeb(spec.query, {
                  lang: spec.lang,
                  region: spec.region,
                  numResults: numResultsPerQuery,
                }),
            });
            if (r.fromCache) cacheHits++;
            else cacheMisses++;
            if (r.cacheWriteError && !firstCacheWriteError) firstCacheWriteError = r.cacheWriteError;
            allResults.push(...r.results);
          }
          diagnostics.fallbackUsed = true;
          diagnostics.fallbackProvider = fallbackName;
        } catch (fallbackErr) {
          diagnostics.externalSearchError = externalSearchError;
          await db
            .update(externalInsightJobsTable)
            .set({
              status: "failed",
              finishedAt: new Date(),
              error: externalSearchError.message,
              diagnostics: { ...diagnostics, errorStage: "search" },
            })
            .where(eq(externalInsightJobsTable.id, job.id));
          revalidatePath("/dashboard");
          revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
          return {
            success: false,
            error: isDev ? externalSearchError.message : "Externe Umfeldsuche fehlgeschlagen.",
            externalSearchStatus: "error" as const,
            externalSearchError,
            diagnostics,
          };
        }
      } else {
        diagnostics.externalSearchError = externalSearchError;
        await db
          .update(externalInsightJobsTable)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: externalSearchError.message,
            diagnostics: { ...diagnostics, errorStage: "search" },
          })
          .where(eq(externalInsightJobsTable.id, job.id));
        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
        return {
          success: false,
          error: isDev ? externalSearchError.message : "Externe Umfeldsuche fehlgeschlagen.",
          externalSearchStatus: "error" as const,
          externalSearchError,
          diagnostics,
        };
      }
    }

    if (allResults.length === 0) {
      diagnostics.externalSearchError = externalSearchError;
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: externalSearchError?.message ?? "Alle Suchanfragen fehlgeschlagen.",
          diagnostics: { ...diagnostics, errorStage: "search" },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return {
        success: false,
        error: isDev ? (externalSearchError?.message ?? "Alle Suchanfragen fehlgeschlagen.") : "Externe Umfeldsuche fehlgeschlagen.",
        externalSearchStatus: "error" as const,
        externalSearchError: externalSearchError ?? { provider: providerName, message: "Alle Suchanfragen fehlgeschlagen." },
        diagnostics,
      };
    }

    diagnostics.partialSearch = anyQueryFailed;

    diagnostics.usedCache = cacheHits > 0;
    diagnostics.cacheHits = cacheHits;
    diagnostics.cacheMisses = cacheMisses;
    diagnostics.inFlightDeduped = inFlightDeduped;
    diagnostics.cacheWriteSkippedDueToNewer = cacheWriteSkippedDueToNewer;
    if (firstCacheWriteError) diagnostics.cacheWriteError = firstCacheWriteError;
    if (latestFetchedAt) {
      diagnostics.latestFetchedAtUsed = latestFetchedAt.toISOString();
    }
    diagnostics.defaultsApplied = {
      langDefaulted: anyLangDefaulted,
      regionDefaulted: anyRegionDefaulted,
    };

    const capped = allResults.slice(0, PROD_MAX_RAW_RESULTS);
    diagnostics.rawResultsCount = capped.length;
    diagnostics.rawOrganicCount = capped.filter((r) => (r as SearchResult & { kind?: string }).kind !== "news").length;
    diagnostics.rawNewsCount = capped.filter((r) => (r as SearchResult & { kind?: string }).kind === "news").length;
    diagnostics.minSourcesRequired = MIN_SOURCES_PER_DRIVER;
    diagnostics.minDomainsRequired = MIN_DOMAINS_PER_DRIVER;

    const canonicalToResult = new Map<string, SearchResult>();
    const domainCount = new Map<string, number>();
    let unclassifiedSourcesCount = 0;

    for (const r of capped) {
      const canonical = canonicalizeUrl(r.url);
      if (canonicalToResult.has(canonical)) continue;
      const domain = getDomainFromUrl(r.url);
      if (!domain) continue;
      const count = domainCount.get(domain) ?? 0;
      if (count >= MAX_DOMAIN_CAP) continue;
      if (!isDomainWhitelisted(r.url)) {
        unclassifiedSourcesCount++;
      }

      canonicalToResult.set(canonical, r);
      domainCount.set(domain, count + 1);
    }

    diagnostics.unclassifiedSourcesCount = unclassifiedSourcesCount;
    const allSourcesForVerify = Array.from(canonicalToResult.values());
    diagnostics.whitelistKeptCount = allSourcesForVerify.length;

    const verified: Array<SearchResult & { domain: string }> = [];
    let sourcesDroppedNotVerified = 0;
    for (const r of allSourcesForVerify.slice(0, 50)) {
      if (verified.length >= MAX_VERIFIED_FOR_GPT) break;
      const ok = await verifyUrl(r.url);
      if (ok) {
        const domain = getDomainFromUrl(r.url) ?? "";
        verified.push({ ...r, domain });
      } else {
        sourcesDroppedNotVerified++;
      }
    }
    diagnostics.verifiedCount = verified.length;
    diagnostics.sourcesDroppedNotVerified = sourcesDroppedNotVerified;

    if (verified.length === 0) {
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: "Keine verifizierten Quellen gefunden.",
          diagnostics: { ...diagnostics, errorStage: "verify" },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return { success: false, error: "Keine verifizierten Quellen gefunden." };
    }

    // PublishedAt mandatory: extract when missing, then drop sources without date
    const verifiedWithDates = await Promise.all(
      verified.map(async (v) => {
        const raw = v.date ?? v.publishedAt;
        if (raw) {
          const normalized = normalizeDateToYyyyMmDd(raw);
          if (normalized) {
            return { ...v, date: normalized, publishedAt: normalized };
          }
        }
        const extracted = await extractPublishedAtFromUrl(v.url);
        if (extracted) {
          return { ...v, date: extracted, publishedAt: extracted };
        }
        return v;
      })
    );

    const hasValidDate = (v: { date?: string; publishedAt?: string }) => {
      const d = v.date ?? v.publishedAt;
      return typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d.trim());
    };
    const datedOnly = verifiedWithDates.filter(hasValidDate);
    diagnostics.sourcesDroppedNoDate = verifiedWithDates.length - datedOnly.length;

    diagnostics.datedKeptCount = datedOnly.length;

    const sourceYears = datedOnly.reduce((acc, s) => {
      const d = s.date ?? s.publishedAt;
      const y = typeof d === "string" ? d.slice(0, 4) : "";
      if (y) acc[y] = (acc[y] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    diagnostics.sourcesByYear = sourceYears;

    const sourcesKeptByType: Record<string, number> = {};
    const sourcesKeptByTier: Record<string, number> = {};
    for (const v of datedOnly) {
      const rule = getDomainRule(v.url);
      if (rule) {
        sourcesKeptByType[rule.type] = (sourcesKeptByType[rule.type] ?? 0) + 1;
        sourcesKeptByTier[rule.tier] = (sourcesKeptByTier[rule.tier] ?? 0) + 1;
      }
    }
    diagnostics.sourcesKeptByType = sourcesKeptByType;
    diagnostics.sourcesKeptByTier = sourcesKeptByTier;

    if (datedOnly.length === 0) {
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: "Keine Quellen mit Veröffentlichungsdatum gefunden.",
          diagnostics: { ...diagnostics, errorStage: "verify" },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return { success: false, error: "Keine Quellen mit Veröffentlichungsdatum gefunden." };
    }

    const clusters = clusterSources(datedOnly);
    const clustersWithDiversity = clusters.filter((c) => {
      const domains = new Set(c.sources.map((s) => s.domain));
      return c.sources.length >= 2 && domains.size >= 2;
    });

    const sortSourcesByDate = (sources: typeof datedOnly) =>
      [...sources].sort((a, b) => {
        const da = a.date ?? a.publishedAt;
        const db = b.date ?? b.publishedAt;
        const ta = typeof da === "string" ? new Date(da).getTime() : 0;
        const tb = typeof db === "string" ? new Date(db).getTime() : 0;
        return tb - ta;
      });

    let clusterBriefs = clustersWithDiversity.map((c) => ({
      clusterId: c.id,
      title: c.title,
      summary: c.summary,
      allowedSources: sortSourcesByDate(c.sources).map((s) => ({
        url: s.url,
        publisher: s.source ?? s.publisher ?? s.domain,
        date: s.date ?? s.publishedAt,
        domain: s.domain,
        title: (s as { title?: string }).title ?? "",
        snippet: (s as { snippet?: string }).snippet?.slice(0, 300),
      })),
    }));

    if (clusterBriefs.length === 0 && datedOnly.length >= 2) {
      const domains = new Set(datedOnly.map((s) => s.domain));
      if (domains.size >= 2) {
        const byDate = sortSourcesByDate(datedOnly);
        clusterBriefs = [{
          clusterId: "fallback",
          title: (byDate[0] as { title?: string })?.title || "Fallback-Cluster",
          summary:
            byDate
              .map((s) => (s as { snippet?: string }).snippet)
              .filter(Boolean)
              .join(" ")
              .slice(0, 300) || "Externe Signale",
          allowedSources: byDate.map((s) => ({
            url: s.url,
            publisher: s.source ?? s.publisher ?? s.domain,
            date: s.date ?? s.publishedAt,
            domain: s.domain,
            title: (s as { title?: string }).title ?? "",
            snippet: (s as { snippet?: string }).snippet?.slice(0, 300),
          })),
        }];
      }
    }

    diagnostics.clusterCount = clusterBriefs.length;

    if (clusterBriefs.length === 0) {
      const domains = new Set(datedOnly.map((s) => s.domain));
      const domainCount = domains.size;
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: domainCount < 2
            ? "Nicht genügend Quellenvielfalt: Mindestens 2 verschiedene Domains erforderlich. Aktuell nur eine Domain in den verifizierten Quellen."
            : "Keine thematischen Cluster aus den Quellen gebildet.",
          diagnostics: { ...diagnostics, errorStage: "gpt", clusterBriefsEmpty: true, datedOnlyDomains: domainCount },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return {
        success: false,
        error: domainCount < 2
          ? "Nicht genügend Quellenvielfalt: Mindestens 2 verschiedene Domains erforderlich."
          : "Keine thematischen Cluster aus den Quellen gebildet.",
      };
    }

    const urlSet = new Set<string>();
    for (const v of datedOnly) {
      urlSet.add(v.url);
      urlSet.add(canonicalizeUrl(v.url));
    }

    const isFallbackCluster = clusterBriefs.length === 1 && clusterBriefs[0]?.clusterId === "fallback";
    const clusterRule = isFallbackCluster
      ? `Du erhältst EINEN thematischen Cluster mit allen erlaubten Quellen. Extrahiere 5–${MAX_TOTAL_DRIVERS} verschiedene Treiber aus diesem Cluster (jeder Treiber nutzt unterschiedliche Quellen-Unterthemen).`
      : `Du erhältst thematische Cluster mit erlaubten Quellen. Max 1 Treiber pro Cluster.`;

    if (validated.refreshOnly === "pestel" || validated.refreshOnly === "both") {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: umfeldInsightJsonSchema,
      system: `Du bist ein Senior Strategy Analyst. Erstelle "Umfeld-Insights" (externe Treiber) für ein Strategie-Projekt. Du agierst als persönlicher Marketingberater deines Klienten.

DU-FORM (PFLICHT): Alle Ausgaben (summary, extendedSummary, strategicImplication, relevanceReason) müssen den Leser mit "du" ansprechen. Er soll sich persönlich angesprochen fühlen – z.B. "Für dich bedeutet das …", "Dein Markt …". Keine Sie-Form.

Regeln:
- Antworte auf Deutsch.
- Kategorien: PESTEL. Nutze für id genau: "political", "economic", "sociocultural", "technological", "ecological", "legal". title auf Deutsch (z.B. "Politische Faktoren").
- Nur Kategorien mit relevanten Treibern. Streue über mindestens 2–3 verschiedene PESTEL-Kategorien.
- Pro PESTEL-Kategorie mindestens 2 Treiber, wenn die Quellen das hergeben. Max ${MAX_DRIVERS_PER_CATEGORY} pro Kategorie, insgesamt max ${MAX_TOTAL_DRIVERS}.
- Bevorzuge Quellen aus 2025 gegenüber 2024. Nur aktuelle, relevante Informationen.
- ${clusterRule}
- Jeder Treiber MUSS sourceUrls NUR aus der erlaubten Liste seines Clusters verwenden. Keine erfundenen URLs.
- HARTE REGEL: Jeder Treiber muss mindestens ZWEI Quellen aus MINDESTENS ZWEI VERSCHIEDENEN Domains zitieren (sourceUrls.length >= 2, unique domains >= 2). Wenn nicht möglich: Treiber NICHT ausgeben.
- title: konkrete, überprüfbare Aussage (kein Allgemeinplatz).
- summary: 1–2 Sätze Einordnung.
- extendedSummary: AUSFÜHRLICHE Zusammenfassung der Quellenartikel (3–6 Sätze). Fasse die Inhalte aus title und snippet der erlaubten Quellen zusammen: Was berichten die Artikel konkret? Welche Fakten, Zahlen, Prognosen, Entwicklungen? Der Leser soll verstehen, worum es geht, ohne die Quellen zu öffnen. In Du-Form („du" ansprechen). (Pflicht, min. 80 Zeichen)
- relevanceReason: Warum ist das für dieses Unternehmen relevant? (Pflicht)
- strategicImplication: Kurze Strategieableitung (1–2 Sätze): Was bringt diese Information dem Leser? In Du-Form – z.B. "Für dich bedeutet das …". Fokus auf Informationswert für die Situationsanalyse – informieren, nicht umsetzen. (Pflicht)
- entityLinks (optional): Wenn du Unternehmen erwähnst: [{ name: "Firmenname", url: "https://..." }]. url angeben wenn: (a) eine der sourceUrls die Unternehmenswebseite ist, ODER (b) es eine sehr bekannte Marke ist und du die offizielle Webseite sicher kennst (z.B. Siemens, Bosch, SAP). Bei bekannten Marken url hinzufügen, damit der Name klickbar wird. Bei unsicheren Fällen url weglassen.
- impact: 1–5 (5 = höchster Einfluss).
- direction: "chance" | "risk" (neutral vermeiden).
- horizon: "now" | "3-12m" | "12m+".
- tags: max 3 Schlagworte.

KONTEXT-NUTZUNG: Du erhältst fragebogen_antworten (Originalantworten des Nutzers) sowie bestehende Situationsanalyse-Artefakte. Die Fragebogen-Antworten enthalten oft echte, wichtige Informationen – nutze sie explizit. Baue auf allem auf, widersprich nicht. Ergänze mit neuen Erkenntnissen aus den Quellen.`,
      prompt: `Strategieprofil-Kontext:
${JSON.stringify(
  {
    one_liner: strategyProfile?.summary && typeof strategyProfile.summary === "object"
      ? (strategyProfile.summary as Record<string, unknown>).one_liner
      : "",
    market: strategyProfile?.inputs_echo,
    target: strategyProfile?.target_group,
  },
  null,
  2
)}

Bestehende Situationsanalyse-Artefakte (nutze als Kontext, ergänze und baue darauf auf):
${JSON.stringify(situationsanalyseContext, null, 2)}

Thematische Cluster mit erlaubten Quellen${isFallbackCluster ? " (extrahiere mehrere Treiber aus dem einen Cluster)" : " (max 1 Treiber pro Cluster)"}, jeder Treiber >=2 Quellen aus >=2 Domains:
${JSON.stringify(clusterBriefs, null, 2)}

Extrahiere die wichtigsten externen Treiber (5–9 insgesamt) und ordne sie Kategorien zu. Pro Kategorie mindestens 2 Treiber wenn möglich. Bevorzuge aktuelle Quellen (2025). Nutze NUR URLs aus den erlaubten Quellen der Cluster.`,
    });

    const raw = object as { categories: Array<{
      id: string;
      title: string;
      drivers: Array<{
        title: string;
        summary: string;
        impact: 1 | 2 | 3 | 4 | 5;
        horizon: "now" | "3-12m" | "12m+";
        direction: "chance" | "risk" | "neutral";
        tags: string[];
        sourceUrls: string[];
      }>;
    }> };

    const verifiedUrlToSource = new Map<string, ExternalDriverSource>();
    for (const v of datedOnly) {
      const rule = getDomainRule(v.url);
      const src: ExternalDriverSource = {
        name: v.title || v.domain,
        url: v.url,
        date: (v.date ?? v.publishedAt) as string,
        domain: v.domain,
        type: rule ? rule.type : "unclassified",
        tier: rule ? rule.tier : "unclassified",
      };
      verifiedUrlToSource.set(v.url, src);
      verifiedUrlToSource.set(canonicalizeUrl(v.url), src);
    }

    /** Confidence scoring: +3 tier1, +2 tier2, +1 tier3, +0 unclassified; +1 if freshest <= 7d; +1 if >=3 domains */
    function calculateDriverConfidence(
      driverSources: ExternalDriverSource[]
    ): "high" | "medium" | "low" {
      let score = 0;
      const tierScores: Record<string, number> = {
        tier1: 3,
        tier2: 2,
        tier3: 1,
        unclassified: 0,
      };
      for (const s of driverSources) {
        const tier = s.tier ?? "unclassified";
        score += tierScores[tier] ?? 0;
      }
      const domains = new Set(driverSources.map((s) => s.domain).filter(Boolean));
      if (domains.size >= 3) score += 1;
      const dates = driverSources.map((s) => s.date).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}/.test(d));
      const freshest = dates.length > 0 ? dates.sort((a, b) => b.localeCompare(a))[0] : undefined;
      if (freshest) {
        const daysAgo = Math.floor((Date.now() - new Date(freshest).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo <= 7) score += 1;
      }
      if (score >= 6) return "high";
      if (score >= 3) return "medium";
      return "low";
    }

    const tierOrder: Record<string, number> = { tier1: 0, tier2: 1, tier3: 2 };
    function sortKeyForSource(s: ExternalDriverSource): number {
      const rule = getDomainRule(s.url);
      const tier = rule ? tierOrder[rule.tier] ?? 0 : 99;
      const date = s.date ?? "";
      return tier * 1e10 - new Date(date).getTime();
    }

    let driversDroppedNoDate = 0;
    let driversDroppedTooFewSources = 0;
    let driversDroppedNotEnoughDomains = 0;
    let driversDroppedMissingImplication = 0;
    const categories: ExternalDriversArtifact["categories"] = [];

    for (const cat of raw.categories.slice(0, MAX_CATEGORIES)) {
      const rel = (cat as { relevance?: "high" | "medium" | "low" }).relevance;
      const relevance = rel === "high" || rel === "medium" || rel === "low" ? rel : "medium";
      const drivers: ExternalDriversArtifact["categories"][0]["drivers"] = [];
      for (const d of cat.drivers) {
        const candidates: ExternalDriverSource[] = [];
        const seenCanon = new Set<string>();
        for (const u of d.sourceUrls) {
          const canon = canonicalizeUrl(u);
          if (seenCanon.has(canon)) continue;
          const src = verifiedUrlToSource.get(u) ?? verifiedUrlToSource.get(canon);
          if (src && (urlSet.has(canon) || urlSet.has(u)) && src.date && /^\d{4}-\d{2}-\d{2}/.test(src.date)) {
            candidates.push(src);
            seenCanon.add(canon);
          }
        }
        if (candidates.length === 0) {
          driversDroppedNoDate++;
          continue;
        }

        const byDomain = new Map<string, ExternalDriverSource>();
        for (const s of candidates.sort((a, b) => sortKeyForSource(a) - sortKeyForSource(b))) {
          const dom = s.domain ?? getDomainFromUrl(s.url) ?? "";
          if (!dom) continue;
          if (!byDomain.has(dom)) byDomain.set(dom, s);
        }
        const sources = Array.from(byDomain.values());

        if (sources.length < MIN_SOURCES_PER_DRIVER) {
          driversDroppedTooFewSources++;
          continue;
        }
        const uniqueDomains = new Set(sources.map((s) => s.domain ?? getDomainFromUrl(s.url)).filter(Boolean));
        if (uniqueDomains.size < MIN_DOMAINS_PER_DRIVER) {
          driversDroppedNotEnoughDomains++;
          continue;
        }

        const impactType = d.direction === "chance" ? "chance" : "risk";
        const impactLevel = (d.impact ?? 3) >= 4 ? "high" : "medium";

        const strategicImplication = (d as { strategicImplication?: string }).strategicImplication?.trim() ?? "";
        if (strategicImplication.length === 0) {
          driversDroppedMissingImplication++;
          continue;
        }

        const dates = sources.map((s) => s.date!).filter(Boolean);
        const freshestSourceDate = dates.length > 0 ? dates.sort((a, b) => b.localeCompare(a))[0] : undefined;
        const confidence = calculateDriverConfidence(sources);

        const extendedSummary = (d as { extendedSummary?: string }).extendedSummary?.trim() ?? "";
        const rawEntityLinks = (d as { entityLinks?: Array<{ name?: string; url?: string }> }).entityLinks;
        const entityLinks = Array.isArray(rawEntityLinks)
          ? rawEntityLinks
              .filter((e) => e?.name && typeof e.name === "string")
              .map((e) => ({ name: e.name!, url: typeof e.url === "string" && e.url.startsWith("http") ? e.url : undefined }))
          : undefined;

        drivers.push({
          title: d.title,
          summary: d.summary,
          extendedSummary: extendedSummary || undefined,
          impact: d.impact,
          horizon: d.horizon,
          direction: d.direction,
          tags: d.tags,
          relevanceReason: (d as { relevanceReason?: string }).relevanceReason ?? "",
          strategicImplication,
          entityLinks: entityLinks && entityLinks.length > 0 ? entityLinks : undefined,
          impactType,
          impactLevel,
          validated: true,
          sources,
          freshestSourceDate,
          sourceCount: sources.length,
          domainCount: uniqueDomains.size,
          confidence,
          clusterKey: cat.id,
          clusterTitle: cat.title,
        });
      }
      if (drivers.length > 0) {
        categories.push({
          id: cat.id,
          title: cat.title,
          relevance,
          drivers,
          clusterKey: cat.id,
          clusterTitle: cat.title,
        });
      }
    }

    diagnostics.driversDroppedNoDate = driversDroppedNoDate;
    diagnostics.driversDroppedTooFewSources = driversDroppedTooFewSources;
    diagnostics.driversDroppedNotEnoughDomains = driversDroppedNotEnoughDomains;
    diagnostics.driversDroppedMissingImplication = driversDroppedMissingImplication;

    const generatedAt = new Date().toISOString();
    const artifactData: ExternalDriversArtifact = {
      label: "Umfeld-Insights",
      generatedAt,
      categories,
    };

    const filtered = await filterVerifiedSourcesInPestelArtifact(
      artifactData as unknown as Record<string, unknown>,
      { useDomainWhitelist: false }
    ) as ExternalDriversArtifact;

    const finalCategories = (filtered.categories ?? []).filter(
      (c) => c.drivers && c.drivers.length > 0
    );

    const driversKeptCount = finalCategories.reduce(
      (sum, c) => sum + (c.drivers?.length ?? 0),
      0
    );
    const driversByConfidence = { high: 0, medium: 0, low: 0 };
    for (const c of finalCategories) {
      for (const d of c.drivers ?? []) {
        const conf = d.confidence ?? "low";
        if (conf === "high") driversByConfidence.high++;
        else if (conf === "medium") driversByConfidence.medium++;
        else driversByConfidence.low++;
      }
    }
    diagnostics.driversByConfidence = driversByConfidence;
    const gptSourcesUsedCount = new Set(
      finalCategories.flatMap((c) =>
        (c.drivers ?? []).flatMap((d) => d.sources?.map((s) => s.url) ?? [])
      )
    ).size;
    diagnostics.gptSourcesUsedCount = gptSourcesUsedCount;
    diagnostics.driversKeptCount = driversKeptCount;

    if (finalCategories.length === 0) {
      await db
        .update(externalInsightJobsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: "Keine Treiber mit verifizierten Quellen extrahiert.",
          diagnostics: { ...diagnostics, errorStage: "gpt" },
        })
        .where(eq(externalInsightJobsTable.id, job.id));
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
      return { success: false, error: "Keine Treiber mit verifizierten Quellen extrahiert." };
    }

    const maxVersion = await db
      .select({
        v: sql<number>`coalesce(max(${artifactsTable.version}), 0)::int`,
      })
      .from(artifactsTable)
      .where(
        and(
          eq(artifactsTable.projectId, validated.projectId),
          eq(artifactsTable.sessionId, session.id),
          eq(artifactsTable.phaseId, "phase_1"),
          eq(artifactsTable.artifactKey, "pestel")
        )
      );

    const nextVersion = (maxVersion[0]?.v ?? 0) + 1;

    await db.insert(artifactsTable).values({
      projectId: validated.projectId,
      userId,
      sessionId: session.id,
      phaseId: "phase_1",
      artifactKey: "pestel",
      version: nextVersion,
      locked: false,
      data: { ...filtered, categories: finalCategories },
    });
    }

    if (validated.refreshOnly === "porter" || validated.refreshOnly === "both") {
    // Porter Five Forces – aus denselben Suchquellen extrahieren
    // jsonSchema statt Zod: Umgeht Zod-v4-zu-JSON-Konvertierungsprobleme ("Invalid schema for response_format")
    // OpenAI Structured Outputs verlangt additionalProperties: false auf allen Objekten
    const porterJsonSchema = jsonSchema<{
      forces: Array<{
        key: string;
        label: string;
        pressure: number;
        insights: string[];
        market_actors?: string[];
        strategic_insight?: string;
        detailed_analysis?: Record<string, unknown>;
      }>;
      conclusion?: {
        market_attractiveness_summary?: string;
        biggest_risks?: string[];
        biggest_opportunities?: string[];
        strategic_directions?: string[];
      };
    }>({
      type: "object",
      properties: {
        forces: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: ["rivalry", "new_entrants", "buyer_power", "supplier_power", "substitutes"] },
              label: { type: "string" },
              pressure: { type: "integer", minimum: 0, maximum: 100 },
              insights: { type: "array", items: { type: "string" } },
              market_actors: { type: "array", items: { type: "string" } },
              strategic_insight: { type: "string" },
              source_urls: { type: "array", items: { type: "string" } },
              entity_links: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, url: { type: "string" } },
                  required: ["name"],
                  additionalProperties: false,
                },
              },
              detailed_analysis: {
                type: "object",
                properties: {
                  stability_level: { type: "string", enum: ["Niedrig", "Mittel", "Hoch"] },
                  short_summary: { type: "string" },
                  competition_impact: { type: "string" },
                  entry_barriers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        strength: { type: "string", enum: ["Niedrig", "Mittel", "Hoch"] },
                        rationale: { type: "string" },
                        details: { type: "string" },
                      },
                      required: ["name", "strength", "rationale", "details"],
                      additionalProperties: false,
                    },
                  },
                  potential_new_entrants: { type: "array", items: { type: "string" } },
                  top_substitutes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        relevanz: { type: "string", enum: ["Hoch", "Mittel", "Niedrig"] },
                        why_attractive: { type: "string" },
                        examples: { type: "string" },
                      },
                      required: ["name", "relevanz", "why_attractive"],
                      additionalProperties: false,
                    },
                  },
                  switch_triggers: { type: "array", items: { type: "string" } },
                  protection_factors: { type: "array", items: { type: "string" } },
                  porter_interactions: { type: "string" },
                  early_indicators: { type: "string" },
                  strategic_implication: { type: "string" },
                },
                additionalProperties: false,
              },
            },
            required: ["key", "label", "pressure", "insights"],
            additionalProperties: false,
          },
        },
        conclusion: {
          type: "object",
          properties: {
            market_attractiveness_summary: { type: "string" },
            biggest_risks: { type: "array", items: { type: "string" } },
            biggest_opportunities: { type: "array", items: { type: "string" } },
            strategic_directions: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      },
      required: ["forces"],
      additionalProperties: false,
    });

    const { object: porterRaw } = await generateObject({
      model: openai("gpt-4o"),
      schema: porterJsonSchema,
      providerOptions: {
        openai: { strictJsonSchema: false },
      },
      system: `Du bist ein erfahrener Marketing- und Strategieberater mit über 40 Jahren Erfahrung (Top-Tier Beratung, Fokus Markt- & Wettbewerbsanalyse). Du agierst als persönlicher Marketingberater deines Klienten. Stil: pragmatisch, entscheidungsorientiert, ruhig im Ton, Fokus auf Wesentliches – keine akademischen Floskeln, keine Panikmache.

DU-FORM (PFLICHT): Sprich den Leser immer mit "du" an. Er soll sich persönlich angesprochen fühlen. Formuliere alle Ausgaben (short_summary, competition_impact, strategic_implication, insights, conclusion usw.) in Du-Form – z.B. "Für dich bedeutet das …", "Du solltest …", "Dein Markt …". Keine Sie-Form, keine unpersönliche "man"-Formulierung.

Deine Aufgabe: Porter-Five-Forces-Analyse für den konkreten Markt aus den bereitgestellten Web-Quellen erstellen.
Zielgruppe: Gründer, Produktmanager, Marketing-Entscheider.

WICHTIGSTE REGEL – Marktrecherche:
- Nutze NUR aktuelle Informationen aus den bereitgestellten Web-Quellen
- Verlasse dich NICHT auf dein internes Wissen – ziehe aktiv die Quellen heran
- Nenne konkrete Unternehmen, Branchenberichte, News, Zahlen aus den Artikeln
- Keine Lehrbuchdefinitionen, keine generischen Buzzwords

1. QUELLEN & AKTUALITÄT:
- Priorisierung nach Jahr: 2025 > 2024 > 2023. Bevorzuge neuere Quellen.
- Maximales Quellenalter: Quellen älter als 24 Monate nur als Ergänzung, nie als alleiniger Beleg. Quelle gilt als veraltet ab 24 Monaten.
- Wenn nur ältere Quellen verfügbar: Hinweis einbauen (z.B. "basierend auf Daten von 2023").
- Wikipedia (wikipedia.org): Nie als einzige oder primäre Quelle für Unternehmen, Zahlen oder Marktaussagen – nur für Definitionen/Basics.
- Kritische Aussagen (Marktanteile, konkrete Unternehmen): mindestens 2 Quellen.
- Jede entry_barrier, jeder potential_new_entrant: quellenbelegt. Keine Aussage ohne Quellenbezug.

2. ANTI-HALLUZINATION (KRITISCH):
- Jeder Firmenname MUSS in den bereitgestellten Quellen vorkommen. Keine "ähnlichen" oder "typischen" Beispiele erfinden.
- Prozentangaben, Marktgrößen, Wachstumsraten nur mit explizitem Quellenverweis. Keine Zahlen ohne Quelle.
- "Studien zeigen …" nur mit konkreter Studie/Quelle. Keine Studien ohne Nennung.
- Wenn plausibel, aber nicht quellenbelegt: als "plausible Marktannahme" oder "typischerweise" kennzeichnen – nie als Fakt.
- VERBOTENE Platzhalter: "ein großer Anbieter", "führende Unternehmen", "Company X", "Anbieter A/B".
- Ähnliche Firmennamen (z.B. SAP vs. SAP SE) klar trennen; keine Vermischung von Konzernen und Tochtergesellschaften.

3. BUSINESS-RELEVANZ: Immer nutzen: one_liner, offer_type, geo_market, target_group, buyer_type – Analyse muss darauf Bezug nehmen. Regionale Differenzierung: DE/EU vs. global – unterschiedliche Barrieren, Regulierung, Akteure. Keine globalen Aussagen für lokale Märkte. B2B vs. B2C: B2B = längere Zyklen, Beziehungen, Zertifizierungen; B2C = Marken, Skalierung, Vertrieb. Größenklassen: Startup vs. KMU vs. Konzern – unterschiedliche Eintrittsbarrieren. Branchenneutralität: Keine fest verdrahteten Branchen – Logik aus Kontext und Quellen ableiten.

4. BERATER-TON & 40 JAHRE ERFAHRUNG: Entscheidungsorientiert – jede Aussage mit klarer Handlungsimplikation. Keine rein deskriptiven Floskeln. Keine Buzzwords (Disruption, Game Changer, Paradigmenwechsel) ohne konkrete Bedeutung. Pragmatisch statt akademisch – kurze, klare Sätze, keine überlangen Theoriediskussionen. strategic_implication: 2–3 umsetzbare Maßnahmen. "könnte/möglicherweise" nur wenn Unsicherheit aus Quellen folgt – sonst klare Aussage. Keine Marketing-Sprache, kein übertriebenes Lob, keine Superlative ohne Beleg. Mustererkennung: Typische Branchenmuster benennen (z.B. "In regulierten Märkten …"). Historische Einordnung: Wo sinnvoll, Entwicklungen der letzten Jahre skizzieren. Ruhe im Ton, Fokus auf Wesentliches – nur das Nötige, keine Fülltexte.

5. GREIFBARKEIT: Konkrete Zeitrahmen ("2–3 Jahre" statt "mittelfristig"). Namen statt Kategorien ("Siemens, Bosch, ABB" statt "große Industriekonzerne"). Zahlen wo belegt ("ca. 15 % Marktanteil" statt "signifikant"). Szenarien: "Wenn X eintritt, dann Y" – klare Ursache–Wirkung. Formulierungen so, dass der Leser (du) sie auf sein Geschäft übertragen kann.

6. FALLBACKS: Quellen zu dünn → "basierend auf begrenzten Quellen" + keine starken Faktbehauptungen. Keine Quellen für einen Aspekt → weglassen oder "nicht aus den Quellen ableitbar" kennzeichnen. Widersprüchliche Quellen → beide Perspektiven nennen, begründet einschätzen. Kein Raten – lieber weniger Inhalt als spekulative Aussagen.

7. TECHNISCHE REGELN: Alle source_urls müssen in allowedSources der Cluster vorkommen. Keine erfundenen URLs. Mindestens 2 Domains pro Force (source_urls aus mind. 2 verschiedenen Domains). Schema-Konformität: Alle Felder dem NewEntrantsDetailedSchema entsprechend; keine zusätzlichen Felder.

8. VERBOTENE MUSTER: "Etablierte Marken" ohne konkrete Namen. "Produktlinienerweiterung" ohne Beispiele. "Laut Experten" ohne Quelle. "Die Branche erlebt …" ohne Beleg. Platzhalter wie "Anbieter X", "Unternehmen Y". Lehrbuch-Definitionen (reine Porter-Theorie ohne Marktbezug). Copy-Paste zwischen short_summary, competition_impact und entry_barriers. details als Wiederholung von rationale – details muss NEUE Informationen bringen.

GRUNDSÄTZE:
- Schreibe auf Deutsch
- Bewerte jede Force explizit (pressure: 0–30 = niedrig, 31–60 = mittel, 61–100 = hoch)
- Tonalität: analytisch, präzise, beratend

STRUKTUR PRO FORCE (außer new_entrants):
1. label, pressure, market_actors, insights, strategic_insight, source_urls, entity_links

ENTITY_LINKS (PFLICHT pro Force): Jedes Unternehmen, das du im Text erwähnst, MUSS in entity_links stehen. Format: [{ name: "Firmenname", url: "https://..." }]. url angeben für bekannte Marken (z.B. Jack Wolfskin → https://www.jackwolfskin.de, The North Face → https://www.thenorthface.com, Patagonia → https://www.patagonia.com, Fjällräven → https://www.fjallraven.com, Decathlon → https://www.decathlon.de). Alle erwähnten Unternehmen erfassen – nicht nur eines. Ohne url wird der Name nicht klickbar.

QUELLEN-ZUORDNUNG (PFLICHT für alle 5 Kräfte): Jede Force muss source_urls enthalten – Array mit den URLs aus den erlaubten Quellen (allowedSources in den Clustern), die du für DIESE spezifische Kraft tatsächlich genutzt hast. Nur URLs übernehmen, die in den Quellen vorkommen. Mind. 2 verschiedene Domains pro Force. Mind. 1 URL pro Kraft. Jede entry_barrier und jeder potential_new_entrant quellenbelegt.

BEDROHUNG DURCH NEUE MARKTTEILNEHMER (new_entrants) – PFLICHT:
Für new_entrants MUSS detailed_analysis ausgefüllt werden mit:

1. stability_level: "Niedrig" | "Mittel" | "Hoch" – wie stabil ist die Bewertung?
2. short_summary (KURZFAZIT – WICHTIG): Formuliere spezifisch für das Geschäft des Lesers (one_liner, offer_type, geo_market, target_group). Sprich ihn mit "du" an. Satz 1: Warum ist die Bedrohung für [konkretes Angebot im konkreten Markt] aktuell auf diesem Niveau? Nenne mindestens eine konkrete Barriere oder einen Akteur aus den Quellen. Satz 2: Wie realistisch ist eine Veränderung in 2–3 Jahren – und wodurch? Keine generischen Aussagen. KEINE Formulierung wie „etablierte Marken“ oder „Produktlinienerweiterung“ – nutze stattdessen konkrete Begriffe: z.B. „bestehende Anbieter mit Markenbekanntheit“, „Großunternehmen mit Portfolio-Erweiterung“, nenne echte Firmen aus den Quellen. Der Leser soll denken: „Das trifft genau mein Business.“
3. competition_impact: Wie stark beeinflussen neue Marktteilnehmer Preise, Margen und Wettbewerb? Klare Interpretation. NICHT dieselbe Formulierung wie short_summary – ergänze neue Aspekte.
4. entry_barriers: 4–5 Eintrittsbarrieren (mind. 4, bevorzugt 5). Jede mit: name, strength ("Niedrig"/"Mittel"/"Hoch"), rationale (kurze Begründung, max. 2 Sätze, für die zugeklappte Ansicht), details (PFLICHT – detaillierte Vertiefung für die aufgeklappte Ansicht).

PORTER-BARRIEREN-CHECKLISTE – aus den Quellen ableiten, branchenspezifisch priorisieren:
- Kapitalbedarf & Skaleneffekte: Produktion, Lager, Mindestbestellmengen, Materialeinkauf – typische Porter-Barriere, oft unterschätzt.
- Markenbekanntheit & Vertrauen: Nur mit konkreten Firmennamen aus den Quellen (z.B. Fjällräven, Patagonia).
- Lieferantenbeziehungen & Zugang zu Spezialmaterialien: Gore-Tex, Lizenzgeber, begrenzte Lieferantenkapazität – NICHT dasselbe wie "Distribution".
- Patente & Technologie: IP, Lizenzen, proprietäre Technologien – aus den Quellen belegen.
- Zugang zu Vertriebskanälen: Fachhandel, Retail, Regalfläche, Händlernetz – NICHT mit Logistik vermischen.
- Logistik & Lieferketten: Lager, Versand, Supply Chain – getrennt von Vertriebskanälen betrachten.
- Regulierung & Zertifizierung: REACH, Bluesign, Fair Wear, Compliance – konkrete Labels/Normen nennen. NICHT vage "Nachhaltigkeit" als Barriere; stattdessen "Zertifizierungs- und Compliance-Anforderungen" mit konkreten Beispielen.
- Wechselkosten für Kunden: Kundenbindung, Lock-in – wenn aus Quellen ableitbar.

VERMEIDEN: "Distribution und Logistik" als eine Barriere – trennen in "Zugang zu Vertriebskanälen" und "Logistik & Lieferketten", wenn beide relevant. "Nachhaltigkeit" als unscharfe Barriere – präzisieren zu Zertifizierung/Compliance mit konkreten Standards. Nur 3 Barrieren – Ziel: 4–5.

Jede entry_barrier: eigener, spezifischer name (z.B. "Skalierbare Infrastruktur" statt "Eintrittsbarrieren durch …"). strength-Begründung: rationale soll erklären, warum "Hoch"/"Mittel"/"Niedrig" – nicht nur beschreiben. KRITISCH details vs. rationale: rationale = 1–2 Sätze, kompakte Zusammenfassung. details = ausführliche Vertiefung (mind. 4–5 Sätze oder 6+ Stichpunkte). details DARF rationale NICHT wiederholen. details muss NEUE Infos bringen: Zahlen/Studien aus Quellen, konkrete Akteure, warum Barriere für Neulinge. Nur echte, relevante Infos aus den Quellen.
5. potential_new_entrants: Realistische Akteure, die eintreten könnten – aus den Quellen, keine Fantasiebeispiele
6. porter_interactions: Wechselwirkungen mit anderen Porter-Kräften – Ursache–Wirkung klar formulieren
7. early_indicators: Woran erkennt man steigenden Eintrittsdruck früh? Technologisch, wirtschaftlich, regulatorisch
8. strategic_implication: 2–3 umsetzbare Maßnahmen. Was bedeutet das konkret? Worauf fokussieren, um Eintrittsbarrieren zu sichern?

entity_links (für new_entrants und substitutes): Jedes erwähnte Unternehmen in entity_links – alle mit url wenn bekannte Marke (Jack Wolfskin, The North Face, Patagonia, Fjällräven, Decathlon usw.). Nicht nur ein Unternehmen erfassen.

BEDROHUNG DURCH ERSATZANGEBOTE (substitutes) – PFLICHT:
Für substitutes MUSS detailed_analysis ausgefüllt werden. ZIEL: Der Leser soll sagen: „Krass – daran hätte ich nicht gedacht. Jetzt verstehe ich, welche Alternativen Kunden wirklich haben, wann sie wechseln und was ich strategisch dagegen tun kann.“ Sprich ihn mit "du" an.

Struktur (genau einhalten):
1. stability_level: "Niedrig" | "Mittel" | "Hoch"
2. short_summary: Max. 2 Sätze – Warum ist die Substitutionsgefahr aktuell so? Was könnte sie in 2–3 Jahren erhöhen oder senken? Spezifisch für Angebot/Markt/Zielgruppe. Keine generischen Aussagen.
3. competition_impact: Beginne mit "Wettbewerbsdruck durch Substitute: X %" – dann 1 Satz Interpretation (Impact auf Preis/Marge/Differenzierung). NICHT dieselbe Formulierung wie short_summary.
4. top_substitutes: 3–5 Substitute, priorisiert. Jedes mit:
   - name: Alternative aus Kundensicht (nicht Produktkategorie)
   - relevanz: "Hoch" | "Mittel" | "Niedrig"
   - why_attractive: 1–2 Sätze, warum attraktiv
   - examples: Konkrete Beispiele aus den Quellen (Unternehmen/Tools/Plattformen), wenn verifizierbar – sonst plausible Kategorien
   Substitute-Typen berücksichtigen: Inhouse/Eigenleistung, Standardanbieter/Generalisten, Software/Automatisierung statt Service, Plattform/Marktplatz/Managed Service, Outsourcing (Near-/Offshore)
5. switch_triggers: 4–6 klare Trigger – "Wann wechseln Kunden wirklich?" Als beobachtbare Situationen (Budgetdruck, Standardisierung, interne Teams, neue Regulierung, neue Tools)
6. protection_factors: 3–5 Faktoren, die Substitute ausbremsen (Risiko, Compliance, Fehlerkosten, Komplexität, Zertifizierungen, Integrationen)
7. porter_interactions: 3–5 Ursache–Wirkung-Zeilen (z. B. "↑ Substitute → ↑ Kundenmacht", "↑ Substitute → ↓ Differenzierungsprämie")
8. early_indicators: 4–6 Frühindikatoren für steigende Substitutionsgefahr in 6–18 Monaten – messbar/observable (RFPs, Preisdruck, Hiring beim Kunden, Tool-Adoption)
9. strategic_implication: 3–5 konkrete Maßnahmen. Am Ende 1 starker Insight-One-Liner (fett/entscheidend) – Berater-Output

Keine Lehrbuchdefinitionen. Konkrete, entscheidungsrelevante Aussagen. Wenn Fakten unsicher: als plausible Marktannahmen mit Begründung formulieren.

Porter-Dimensionen (label exakt so auf Deutsch):
1. rivalry → "Wettbewerbsintensität im Markt"
2. new_entrants → "Bedrohung durch neue Marktteilnehmer"
3. buyer_power → "Verhandlungsmacht der Kunden"
4. supplier_power → "Verhandlungsmacht der Lieferanten"
5. substitutes → "Bedrohung durch Ersatzangebote"

NUTZE NUR Informationen aus den erlaubten Quellen. Keine Erfindungen.

ABSCHLUSS (conclusion):
- market_attractiveness_summary, biggest_risks, biggest_opportunities, strategic_directions

ZIEL: Der Leser soll sagen: „Jetzt verstehe ich wirklich, warum neue Wettbewerber hier kaum Chancen haben – und was ich tun muss, damit das so bleibt.“

KURZFAZIT new_entrants: Das short_summary muss so formuliert sein, dass der Leser denkt: „Das trifft genau mein Business.“ Sprich ihn mit "du" an. Nutze one_liner, offer_type, geo_market und target_group explizit. Keine Lehrbuch- oder Branchen-Generik.

WIEDERHOLUNGSVERBOT (KRITISCH): Dieselbe Formulierung darf NICHT in short_summary, competition_impact UND entry_barriers vorkommen. Jeder Abschnitt fügt NEUE Informationen hinzu. Beispiel: Wenn „Produktlinienerweiterung durch etablierte Marken“ in entry_barriers steht, darf es NICHT wörtlich in short_summary oder competition_impact erscheinen – formuliere dort anders (z.B. „bestehende Anbieter erweitern ihr Portfolio“, nenne konkrete Firmen).

QUALITÄTS-SELBSTCHECK vor Ausgabe: Jedes Unternehmen in Quellen belegt? Jede Zahl mit Quelle? Kontext (one_liner, geo_market, target_group) genutzt? Keine generischen Formulierungen? strategic_implication mit konkreten Maßnahmen? Keine Wiederholungen zwischen Abschnitten? Quellen aktuell (2025 > 2024)? Mind. 2 Domains pro Force? entry_barriers: 4–5 Barrieren (nicht nur 3)? "Distribution und Logistik" getrennt? "Nachhaltigkeit" präzisiert zu Zertifizierung/Compliance? rationale begründet Stärke?

KONTEXT-NUTZUNG: Du erhältst fragebogen_antworten (Originalantworten des Nutzers) sowie bestehende Artefakte. Die Fragebogen-Antworten enthalten oft echte, wichtige Informationen – nutze sie explizit. Baue auf allem auf, widersprich nicht.`,
      prompt: `Strategieprofil (für new_entrants-Kurzfazit und Substitute: MARKT, REGION, KUNDENSEGMENTE, ANGEBOT nutzen):
${JSON.stringify(
  {
    one_liner: strategyProfile?.summary && typeof strategyProfile.summary === "object"
      ? (strategyProfile.summary as Record<string, unknown>).one_liner
      : "",
    offer_type: strategyProfile?.inputs_echo && typeof strategyProfile.inputs_echo === "object"
      ? (strategyProfile.inputs_echo as Record<string, unknown>).offer_type
      : "",
    offer_scope: strategyProfile?.inputs_echo && typeof strategyProfile.inputs_echo === "object"
      ? (strategyProfile.inputs_echo as Record<string, unknown>).offer_scope
      : "",
    geo_market: strategyProfile?.inputs_echo && typeof strategyProfile.inputs_echo === "object"
      ? (strategyProfile.inputs_echo as Record<string, unknown>).geo_market
      : "",
    buyer_type: strategyProfile?.inputs_echo && typeof strategyProfile.inputs_echo === "object"
      ? (strategyProfile.inputs_echo as Record<string, unknown>).buyer_type
      : "",
    target_group: strategyProfile?.target_group,
    market: strategyProfile?.market,
    competition: strategyProfile?.competition && typeof strategyProfile.competition === "object"
      ? {
          competitor_names: (strategyProfile.competition as Record<string, unknown>).competitor_names ?? [],
          differentiation_levers: (strategyProfile.competition as Record<string, unknown>).differentiation_levers ?? [],
        }
      : undefined,
    key_trends: strategyProfile?.market && typeof strategyProfile.market === "object"
      ? (strategyProfile.market as Record<string, unknown>).key_trends ?? []
      : [],
  },
  null,
  2
)}

Bestehende Situationsanalyse-Artefakte (nutze als Kontext, ergänze und baue darauf auf):
${JSON.stringify(situationsanalyseContext, null, 2)}

Quellen (Cluster mit erlaubten Artikeln):
${JSON.stringify(clusterBriefs, null, 2)}

Extrahiere alle 5 Porter-Kräfte aus diesen Quellen.
Für new_entrants: Fülle detailed_analysis vollständig aus – nutze ausschließlich Fakten, Unternehmen und Zahlen aus den Quellen.
Für substitutes: Fülle detailed_analysis vollständig aus – nutze die Quellen für top_substitutes (konkrete Beispiele), switch_triggers, protection_factors. Recherchiere gezielt in den Quellen nach: alternative Lösung, Substitute, Software/Automatisierung, Plattform, inhouse vs buy, Outsourcing, neue Anbieter.`,
    });

    // Zweiter Durchlauf: Kurzfazit + Einfluss auf Wettbewerb zu einem zusammenhängenden Text kombinieren, spezifisch für das Geschäft
    const newEntrantsForce = porterRaw.forces?.find(
      (f: { key?: string }) => f.key === "new_entrants"
    ) as { detailed_analysis?: { short_summary?: string; competition_impact?: string; entry_barriers?: unknown[]; potential_new_entrants?: string[] } } | undefined;
    if (
      newEntrantsForce?.detailed_analysis?.short_summary &&
      strategyProfile &&
      typeof strategyProfile === "object"
    ) {
      try {
        const oneLiner = (strategyProfile.summary as Record<string, unknown>)?.one_liner ?? "";
        const offerType = (strategyProfile.inputs_echo as Record<string, unknown>)?.offer_type ?? "";
        const geoMarket = (strategyProfile.inputs_echo as Record<string, unknown>)?.geo_market ?? "";
        const targetGroup = strategyProfile.target_group as Record<string, unknown> | undefined;
        const primaryLabel = targetGroup?.primary_label ?? "";
        const barriers = newEntrantsForce.detailed_analysis.entry_barriers ?? [];
        const entrants = newEntrantsForce.detailed_analysis.potential_new_entrants ?? [];
        const competitionImpact = newEntrantsForce.detailed_analysis.competition_impact ?? "";

        const { text: refinedSummary } = await generateText({
          model: openai("gpt-4o"),
          system: `Du bist ein Strategieberater. Deine Aufgabe: Kurzfazit und Einfluss auf den Wettbewerb zu EINEM zusammenhängenden, flüssigen Absatz zusammenzuführen – spezifisch für das Geschäft des Lesers.

Regeln:
- Auf Deutsch. Ein zusammenhängender Text (3–5 Sätze), kein Aufzählen.
- DU-FORM: Sprich den Leser mit "du" an. Er soll sich persönlich angesprochen fühlen.
- Nenne explizit: Angebotstyp, Markt/Region, Zielgruppe.
- Keine generischen Formulierungen. Der Leser soll denken: "Das trifft genau mein Business."
- WIEDERHOLUNGSVERBOT: Die Eintrittsbarrieren werden separat angezeigt. Wiederhole NICHT die Namen oder Formulierungen der Eintrittsbarrieren wörtlich im Kurzfazit. Stattdessen: Fasse die Kernaussage in eigenen Worten zusammen, nenne konkrete Akteure oder Zahlen aus dem Kontext.`,
          prompt: `Fasse Kurzfazit und Wettbewerbseinfluss zu EINEM zusammenhängenden Absatz zusammen – spezifisch für dieses Geschäft.

Geschäft des Lesers (du sprichst ihn direkt an):
- one_liner: ${oneLiner}
- offer_type: ${offerType}
- geo_market: ${geoMarket}
- Zielgruppe: ${primaryLabel}

Hinweis: Die Eintrittsbarrieren (${(barriers as Array<{ name?: string }>).map((b) => b.name).filter(Boolean).join(", ") || "—"}) werden UNTER dem Kurzfazit separat angezeigt. Wiederhole sie NICHT wörtlich – formuliere den Kurzfazit als eigenständige Synthese.
Potenzielle neue Marktteilnehmer: ${entrants.join(", ") || "—"}

Aktuelles Kurzfazit:
"${newEntrantsForce.detailed_analysis.short_summary}"

Aktueller Einfluss auf Wettbewerb:
"${competitionImpact}"

Schreibe EINEN zusammenhängenden Absatz (3–5 Sätze), der Kurzfazit und Wettbewerbseinfluss verbindet – spezifisch für [${offerType || oneLiner}] im [${geoMarket}]-Markt für [${primaryLabel || "die Zielgruppe"}]. Formuliere komplett neu. Keine wörtliche Wiederholung der Eintrittsbarrieren-Namen.`,
        });

        const trimmed = refinedSummary?.trim();
        if (trimmed && trimmed.length > 0 && trimmed.length <= 900) {
          if (newEntrantsForce.detailed_analysis) {
            newEntrantsForce.detailed_analysis.short_summary = trimmed;
            newEntrantsForce.detailed_analysis.competition_impact = trimmed;
          }
        }
      } catch {
        // Refinement fehlgeschlagen – Original bleibt erhalten
      }
    }

    // Analog für substitutes: Kurzfazit + Einfluss auf Wettbewerb zu einem zusammenhängenden Text
    const substitutesForce = porterRaw.forces?.find(
      (f: { key?: string }) => f.key === "substitutes"
    ) as { detailed_analysis?: { short_summary?: string; competition_impact?: string } } | undefined;
    if (
      substitutesForce?.detailed_analysis?.short_summary &&
      strategyProfile &&
      typeof strategyProfile === "object"
    ) {
      try {
        const oneLiner = (strategyProfile.summary as Record<string, unknown>)?.one_liner ?? "";
        const offerType = (strategyProfile.inputs_echo as Record<string, unknown>)?.offer_type ?? "";
        const geoMarket = (strategyProfile.inputs_echo as Record<string, unknown>)?.geo_market ?? "";
        const targetGroup = strategyProfile.target_group as Record<string, unknown> | undefined;
        const primaryLabel = targetGroup?.primary_label ?? "";
        const competitionImpact = substitutesForce.detailed_analysis.competition_impact ?? "";

        const { text: refinedSummary } = await generateText({
          model: openai("gpt-4o"),
          system: `Du bist ein Strategieberater. Deine Aufgabe: Kurzfazit und Einfluss auf den Wettbewerb zu EINEM zusammenhängenden Absatz zusammenzuführen – spezifisch für das Geschäft des Lesers. DU-FORM: Sprich den Leser mit "du" an.

Regeln:
- Auf Deutsch. Ein zusammenhängender Text (3–5 Sätze).
- Nenne explizit: Angebotstyp, Markt/Region, Zielgruppe.
- Keine generischen Formulierungen. Präzise, entscheidungsrelevante Aussagen.
- Keine wörtliche Wiederholung – synthetisiere die Kernaussagen in eigenen Worten.`,
          prompt: `Fasse Kurzfazit und Wettbewerbseinfluss zu EINEM zusammenhängenden Absatz zusammen – spezifisch für dieses Geschäft:

Geschäft: ${oneLiner} | ${offerType} | ${geoMarket} | Zielgruppe: ${primaryLabel}

Kurzfazit: "${substitutesForce.detailed_analysis.short_summary}"
Wettbewerbseinfluss: "${competitionImpact}"

Schreibe EINEN zusammenhängenden Absatz (3–5 Sätze) – spezifisch für [${offerType || oneLiner}] im [${geoMarket}]-Markt. Formuliere komplett neu, präzise und geschäftsspezifisch.`,
        });

        const trimmed = refinedSummary?.trim();
        if (trimmed && trimmed.length > 0 && trimmed.length <= 900) {
          if (substitutesForce.detailed_analysis) {
            substitutesForce.detailed_analysis.short_summary = trimmed;
            substitutesForce.detailed_analysis.competition_impact = trimmed;
          }
        }
      } catch {
        // Refinement fehlgeschlagen – Original bleibt erhalten
      }
    }

    const FORCE_LABELS: Record<string, string> = {
      rivalry: "Wettbewerbsintensität im Markt",
      new_entrants: "Bedrohung durch neue Marktteilnehmer",
      buyer_power: "Verhandlungsmacht der Kunden",
      supplier_power: "Verhandlungsmacht der Lieferanten",
      substitutes: "Bedrohung durch Ersatzangebote",
    };
    // Quellen aus clusterBriefs sammeln (für new_entrants-Block)
    const porterSources = (() => {
      const seen = new Set<string>();
      const out: { url: string; title?: string; publisher?: string; date?: string }[] = [];
      for (const c of clusterBriefs) {
        for (const s of c.allowedSources ?? []) {
          const url = typeof s.url === "string" ? s.url : "";
          if (url && !seen.has(url)) {
            seen.add(url);
            out.push({
              url,
              title: typeof s.title === "string" ? s.title : undefined,
              publisher: typeof s.publisher === "string" ? s.publisher : undefined,
              date: typeof s.date === "string" ? s.date : undefined,
            });
          }
        }
      }
      return out;
    })();

    // Normalisiere detailed_analysis: pro Force nur die passenden Felder (Union-Schema erwartet entweder new_entrants oder substitutes)
    const porterNormalized = {
      ...porterRaw,
      sources: porterSources.length > 0 ? porterSources : undefined,
      forces: porterRaw.forces.map((f: { key?: string; label?: string; pressure?: unknown; insights?: unknown; detailed_analysis?: Record<string, unknown>; strategic_insight?: string }) => {
        const base = {
          ...f,
          key: f.key ?? "rivalry",
          label: typeof f.label === "string" ? f.label : (FORCE_LABELS[f.key ?? "rivalry"] ?? "—"),
          pressure: typeof f.pressure === "number" ? f.pressure : 50,
          insights: Array.isArray(f.insights) ? f.insights : (f.strategic_insight ? [f.strategic_insight] : []),
        };
        const da = f.detailed_analysis;
        if (!da) return base;
        if (f.key === "new_entrants") {
          const { top_substitutes, switch_triggers, protection_factors, ...rest } = da;
          return { ...base, detailed_analysis: rest };
        }
        if (f.key === "substitutes") {
          const { entry_barriers, potential_new_entrants, ...rest } = da;
          const subs = rest as Record<string, unknown>;
          const rawSubs = Array.isArray(subs.top_substitutes) ? subs.top_substitutes : [];
          const topSubs = rawSubs.slice(0, 5).map((s: { name?: string; relevanz?: string; why_attractive?: string }) => ({
            name: String(s?.name ?? "—").slice(0, 200),
            relevanz: (["Hoch", "Mittel", "Niedrig"].includes(s?.relevanz ?? "") ? s.relevanz : "Mittel") as "Hoch" | "Mittel" | "Niedrig",
            why_attractive: String(s?.why_attractive ?? "—").slice(0, 300),
          }));
          const triggers = (Array.isArray(subs.switch_triggers) ? subs.switch_triggers : []).map(String).slice(0, 6);
          const factors = (Array.isArray(subs.protection_factors) ? subs.protection_factors : []).map(String).slice(0, 5);
          const safeStr = (v: unknown, max: number) => (typeof v === "string" ? v : String(v ?? "")).slice(0, max);
          return {
            ...base,
            detailed_analysis: {
              stability_level: ["Niedrig", "Mittel", "Hoch"].includes(subs.stability_level as string) ? subs.stability_level : "Mittel",
              short_summary: safeStr(subs.short_summary, 900),
              competition_impact: safeStr(subs.competition_impact, 900),
              top_substitutes: topSubs.length >= 3 ? topSubs : [...topSubs, ...Array(Math.max(0, 3 - topSubs.length)).fill(null).map(() => ({ name: "—", relevanz: "Mittel" as const, why_attractive: "—" }))].slice(0, 5),
              switch_triggers: triggers.length >= 4 ? triggers : [...triggers, ...Array(Math.max(0, 4 - triggers.length)).fill("—")].slice(0, 6),
              protection_factors: factors.length >= 3 ? factors : [...factors, ...Array(Math.max(0, 3 - factors.length)).fill("—")].slice(0, 5),
              porter_interactions: safeStr(subs.porter_interactions, 500),
              early_indicators: safeStr(subs.early_indicators, 500),
              strategic_implication: safeStr(subs.strategic_implication, 600),
            },
          };
        }
        return { ...base, detailed_analysis: undefined };
      }),
    };

    const porterValidated = Porter5ForcesSchema.safeParse(porterNormalized);
    if (porterValidated.success) {
      const porterMaxVersion = await db
        .select({
          v: sql<number>`coalesce(max(${artifactsTable.version}), 0)::int`,
        })
        .from(artifactsTable)
        .where(
          and(
            eq(artifactsTable.projectId, validated.projectId),
            eq(artifactsTable.sessionId, session.id),
            eq(artifactsTable.phaseId, "phase_1"),
            eq(artifactsTable.artifactKey, "porter_5_forces")
          )
        );

      const porterNextVersion = (porterMaxVersion[0]?.v ?? 0) + 1;

      await db.insert(artifactsTable).values({
        projectId: validated.projectId,
        userId,
        sessionId: session.id,
        phaseId: "phase_1",
        artifactKey: "porter_5_forces",
        version: porterNextVersion,
        locked: false,
        data: porterValidated.data,
      });
      diagnostics.porterForcesPersisted = true;
    } else {
      diagnostics.porterForcesSkipped = "validation_failed";
    }
    }

    await db
      .update(externalInsightJobsTable)
      .set({
        status: "success",
        finishedAt: new Date(),
        resultGeneratedAt: new Date(),
        error: null,
        diagnostics,
      })
      .where(eq(externalInsightJobsTable.id, job.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorStage: JobDiagnostics["errorStage"] =
      diagnostics.rawResultsCount == null
        ? "search"
        : diagnostics.verifiedCount == null
          ? "verify"
          : diagnostics.driversKeptCount == null
            ? "gpt"
            : "persist";
    await db
      .update(externalInsightJobsTable)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: msg,
        diagnostics: { ...diagnostics, errorStage },
      })
      .where(eq(externalInsightJobsTable.id, job.id));
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
    if (isSearchNotConfiguredError(err)) {
      return { success: false, error: SEARCH_NOT_CONFIGURED };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/final?projectId=${validated.projectId}`);
  revalidatePath(`/wizard/${validated.projectId}/phase-1`);
  return { success: true, diagnostics };
}

/**
 * Dev only: Force refresh without auth. Uses first project in DB or projectId from arg.
 * Run: npx tsx scripts/trigger-force-refresh.ts [projectId]
 */
export async function refreshExternalDriversForDev(
  projectId?: number,
  force = true
): Promise<{ success: boolean; diagnostics?: JobDiagnostics; error?: string }> {
  const allowDev =
    isDev || process.env.FORCE_DEV_REFRESH === "1";
  if (!allowDev) {
    throw new Error("refreshExternalDriversForDev is only available in development (or FORCE_DEV_REFRESH=1)");
  }
  const [project] = projectId
    ? await db
        .select()
        .from(strategyProjectsTable)
        .where(eq(strategyProjectsTable.id, projectId))
        .limit(1)
    : await db
        .select()
        .from(strategyProjectsTable)
        .orderBy(desc(strategyProjectsTable.createdAt))
        .limit(1);
  if (!project) {
    throw new Error("No project found. Create a project first.");
  }
  return refreshExternalDrivers(
    { projectId: project.id, force },
    { userId: project.userId }
  );
}

export async function getExternalInsightJobStatus(projectId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [job] = await db
    .select()
    .from(externalInsightJobsTable)
    .where(
      and(
        eq(externalInsightJobsTable.projectId, projectId),
        eq(externalInsightJobsTable.userId, userId)
      )
    )
    .orderBy(desc(externalInsightJobsTable.startedAt))
    .limit(1);

  return job ?? null;
}

export async function getLastRefreshAt(projectId: number): Promise<Date | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [job] = await db
    .select({ resultGeneratedAt: externalInsightJobsTable.resultGeneratedAt })
    .from(externalInsightJobsTable)
    .where(
      and(
        eq(externalInsightJobsTable.projectId, projectId),
        eq(externalInsightJobsTable.userId, userId),
        eq(externalInsightJobsTable.status, "success")
      )
    )
    .orderBy(desc(externalInsightJobsTable.startedAt))
    .limit(1);

  return job?.resultGeneratedAt ?? null;
}

export type ExternalInsightMeta = {
  generatedAt: string | null;
  canRefresh: boolean;
  nextRefreshInHours: number | null;
  jobRunning: boolean;
  /** When false, UI shows setup steps and disables refresh */
  searchConfigured: boolean;
  /** When true, show Force Refresh button (dev only, bypasses cache + rate limit) */
  showForceRefresh: boolean;
  /** When last job failed with search error – show Alert instead of empty state */
  lastSearchError?: ExternalSearchError | null;
  /** Dev only: last job status, finishedAt, diagnostics for bottleneck analysis */
  lastJob?: {
    status: string;
    finishedAt: string | null;
    error: string | null;
    diagnostics: JobDiagnostics | null;
  } | null;
};

export async function getExternalInsightMeta(
  projectId: number
): Promise<ExternalInsightMeta> {
  const { userId } = await auth();
  const searchConfigured = isSearchConfigured();
  if (!userId) {
    return {
      generatedAt: null,
      canRefresh: false,
      nextRefreshInHours: null,
      jobRunning: false,
      searchConfigured,
      showForceRefresh: isDev,
    };
  }

  const [lastJob] = await db
    .select()
    .from(externalInsightJobsTable)
    .where(
      and(
        eq(externalInsightJobsTable.projectId, projectId),
        eq(externalInsightJobsTable.userId, userId)
      )
    )
    .orderBy(desc(externalInsightJobsTable.startedAt))
    .limit(1);

  const jobRunning = lastJob?.status === "running";
  const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;
  let canRefresh = true;
  let nextRefreshInHours: number | null = null;

  if (
    lastJob?.triggeredBy === "manual" &&
    lastJob?.startedAt &&
    lastJob.status !== "failed"
  ) {
    const elapsed = Date.now() - new Date(lastJob.startedAt).getTime();
    if (elapsed < RATE_LIMIT_MS) {
      canRefresh = false;
      nextRefreshInHours = Math.ceil(
        (RATE_LIMIT_MS - elapsed) / (60 * 60 * 1000)
      );
    }
  }

  const generatedAt =
    lastJob?.status === "success" && lastJob?.resultGeneratedAt
      ? lastJob.resultGeneratedAt.toISOString()
      : null;

  const diag = lastJob?.diagnostics as { errorStage?: string; externalSearchError?: ExternalSearchError } | null;
  const lastSearchError =
    lastJob?.status === "failed" && diag?.errorStage === "search" && diag?.externalSearchError
      ? diag.externalSearchError
      : null;

  return {
    generatedAt,
    canRefresh: searchConfigured ? canRefresh : false,
    nextRefreshInHours,
    jobRunning,
    searchConfigured,
    showForceRefresh: isDev,
    lastSearchError: lastSearchError ?? undefined,
    ...(isDev &&
      lastJob && {
        lastJob: {
          status: lastJob.status,
          finishedAt: lastJob.finishedAt?.toISOString() ?? null,
          error: lastJob.error ?? null,
          diagnostics: lastJob.diagnostics as JobDiagnostics | null,
        },
      }),
  };
}
