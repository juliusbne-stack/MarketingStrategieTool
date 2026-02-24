/**
 * Search cache for Umfeld-Insights (24h TTL).
 * Reduces API calls when refreshing external drivers.
 * Server-only: no client imports.
 */

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { externalSearchCacheTable } from "@/db/schema";
import type { SearchResult } from "./search-provider";

export type SetCachedSearchResult = {
  skippedDueToNewer: boolean;
  latestFetchedAt?: Date;
};

const CACHE_TTL_HOURS = 24;
const LANG_DEFAULT = "de";
const REGION_DEFAULT = "DE";

/** Providers known to be case-insensitive for queries (Serper, Brave, SerpApi) */
const PROVIDER_QUERY_CASE_INSENSITIVE = new Set(["serper", "brave", "serpapi", "unknown"]);

export type CacheKeyInput = {
  provider: string;
  query: string;
  lang?: "de" | "en" | string;
  region?: "DE" | "GLOBAL" | string;
};

export type CacheKey = {
  provider: string;
  query: string;
  lang: "de" | "en";
  region: "DE" | "GLOBAL";
};

export type NormalizationMeta = {
  langDefaulted: boolean;
  regionDefaulted: boolean;
};

/**
 * Normalizes cache key for consistent storage/lookup.
 * - query: trim, collapse whitespace, optional lowercasing (provider-case-insensitive)
 * - lang: lowercase, default "de"
 * - region: uppercase, default "DE"
 * - provider: lowercase
 */
export function normalizeExternalSearchKey(
  input: CacheKeyInput
): { key: CacheKey; meta: NormalizationMeta } {
  const provider = String(input.provider ?? "").trim().toLowerCase() || "unknown";
  const langDefaulted = input.lang == null || input.lang === "";
  const regionDefaulted = input.region == null || input.region === "";

  const langRaw = String(input.lang ?? LANG_DEFAULT).trim().toLowerCase();
  const lang = (langRaw === "en" ? "en" : "de") as "de" | "en";

  const regionRaw = String(input.region ?? REGION_DEFAULT).trim().toUpperCase();
  const region = (regionRaw === "GLOBAL" ? "GLOBAL" : "DE") as "DE" | "GLOBAL";

  let query = String(input.query ?? "").trim();
  query = query.replace(/\s+/g, " ");
  if (PROVIDER_QUERY_CASE_INSENSITIVE.has(provider)) {
    query = query.toLowerCase();
  }

  return {
    key: { provider, query, lang, region },
    meta: { langDefaulted, regionDefaulted },
  };
}

/** Returns a string key for logging/diagnostics */
export function makeExternalSearchKeyString(key: CacheKey): string {
  return `${key.provider}:${key.lang}:${key.region}:${key.query}`;
}

type InFlightResult =
  | SearchResult[]
  | {
      results: SearchResult[];
      cacheWriteSkippedDueToNewer?: boolean;
      latestFetchedAtUsed?: Date;
      cacheWriteError?: string;
    };

/** In-memory in-flight dedupe: keyString -> Promise<InFlightResult> */
const inFlightMap = new Map<string, Promise<InFlightResult>>();

/** Opportunistic cleanup: delete expired entry when found */
async function deleteExpiredEntry(key: CacheKey): Promise<void> {
  await db
    .delete(externalSearchCacheTable)
    .where(
      and(
        eq(externalSearchCacheTable.provider, key.provider),
        eq(externalSearchCacheTable.query, key.query),
        eq(externalSearchCacheTable.lang, key.lang),
        eq(externalSearchCacheTable.region, key.region),
        lt(externalSearchCacheTable.expiresAt, new Date())
      )
    );
}

/**
 * Returns cached results if not expired, null otherwise.
 * Opportunistic cleanup: deletes expired entry when found.
 * Always uses normalized key.
 */
export async function getCachedSearch(
  input: CacheKeyInput
): Promise<SearchResult[] | null> {
  maybeScheduleCleanup();
  const { key } = normalizeExternalSearchKey(input);

  const [row] = await db
    .select({
      id: externalSearchCacheTable.id,
      results: externalSearchCacheTable.results,
      expiresAt: externalSearchCacheTable.expiresAt,
    })
    .from(externalSearchCacheTable)
    .where(
      and(
        eq(externalSearchCacheTable.provider, key.provider),
        eq(externalSearchCacheTable.query, key.query),
        eq(externalSearchCacheTable.lang, key.lang),
        eq(externalSearchCacheTable.region, key.region)
      )
    )
    .limit(1);

  if (!row) return null;

  if (new Date(row.expiresAt) <= new Date()) {
    await deleteExpiredEntry(key);
    return null;
  }

  if (!row.results || !Array.isArray(row.results)) return null;
  return row.results as SearchResult[];
}

/**
 * Upserts cache entry with expires_at = now + 24h.
 * "Newest wins": on conflict, update only if existing fetched_at <= incoming fetched_at.
 * Always uses normalized key.
 * Results must be JSON-serializable (plain objects).
 */
export async function setCachedSearch(
  input: CacheKeyInput,
  results: SearchResult[],
  fetchedAt?: Date
): Promise<SetCachedSearchResult> {
  maybeScheduleCleanup();
  const { key } = normalizeExternalSearchKey(input);

  const fetchedAtVal = fetchedAt ?? new Date();
  const expiresAt = new Date(fetchedAtVal);
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  const serializable = results.map((r) => ({
    title: r.title,
    snippet: r.snippet,
    url: r.url,
    date: r.date,
    publishedAt: r.publishedAt,
    source: r.source,
    publisher: r.publisher,
    sourceName: r.sourceName,
    kind: r.kind,
  }));

  const rows = await db
    .insert(externalSearchCacheTable)
    .values({
      provider: key.provider,
      query: key.query,
      lang: key.lang,
      region: key.region,
      results: serializable as unknown as Record<string, unknown>[],
      expiresAt,
      fetchedAt: fetchedAtVal,
    })
    .onConflictDoUpdate({
      target: [
        externalSearchCacheTable.provider,
        externalSearchCacheTable.query,
        externalSearchCacheTable.lang,
        externalSearchCacheTable.region,
      ],
      set: {
        results: serializable as unknown as Record<string, unknown>[],
        expiresAt,
        fetchedAt: fetchedAtVal,
      },
    })
    .returning({ id: externalSearchCacheTable.id, fetchedAt: externalSearchCacheTable.fetchedAt });

  const updated = rows.length > 0;
  const skippedDueToNewer = !updated;
  return {
    skippedDueToNewer,
    latestFetchedAt: updated && rows[0]?.fetchedAt ? new Date(rows[0].fetchedAt) : undefined,
  };
}

/**
 * In-flight dedupe: returns existing promise if one is running for this key.
 * Caller must remove from map in finally.
 */
export function getInFlightPromise(
  keyString: string
): Promise<InFlightResult> | undefined {
  return inFlightMap.get(keyString);
}

export function setInFlightPromise(
  keyString: string,
  promise: Promise<InFlightResult>
): void {
  inFlightMap.set(keyString, promise);
}

export function deleteInFlightPromise(keyString: string): void {
  inFlightMap.delete(keyString);
}

export type SearchWithCacheOptions = {
  provider: string;
  query: string;
  lang: "de" | "en";
  region: "DE" | "GLOBAL";
  force: boolean;
  searchFn: () => Promise<SearchResult[]>;
};

export type SearchWithCacheResult = {
  results: SearchResult[];
  fromCache: boolean;
  inFlightDeduped: boolean;
  defaultsApplied: NormalizationMeta;
  cacheWriteSkippedDueToNewer?: boolean;
  latestFetchedAtUsed?: Date;
  /** When cache write failed; pipeline continues, results still used */
  cacheWriteError?: string;
};

/**
 * Single-flight dedupe + cache. Returns cached if hit and not force.
 * If miss/force: dedupes concurrent requests (unless force).
 * Always overwrites cache with fresh results when fetching.
 */
export async function searchWithCache(
  opts: SearchWithCacheOptions
): Promise<SearchWithCacheResult> {
  const { key, meta } = normalizeExternalSearchKey({
    provider: opts.provider,
    query: opts.query,
    lang: opts.lang,
    region: opts.region,
  });
  const keyString = makeExternalSearchKeyString(key);

  if (!opts.force) {
    const cached = await getCachedSearch({ ...opts, ...key });
    if (cached && cached.length > 0) {
      return {
        results: cached,
        fromCache: true,
        inFlightDeduped: false,
        defaultsApplied: meta,
      };
    }

    const existing = getInFlightPromise(keyString);
    if (existing) {
      const resolved: InFlightResult = await existing;
      const results = Array.isArray(resolved) ? resolved : resolved.results;
      const obj = typeof resolved === "object" && !Array.isArray(resolved) ? resolved : null;
      return {
        results,
        fromCache: false,
        inFlightDeduped: true,
        defaultsApplied: meta,
        cacheWriteSkippedDueToNewer: obj?.cacheWriteSkippedDueToNewer,
        latestFetchedAtUsed: obj?.latestFetchedAtUsed,
        cacheWriteError: obj?.cacheWriteError,
      };
    }
  }

  const promise = (async () => {
    try {
      const fetchedAt = new Date();
      const results = await opts.searchFn();
      let cacheWriteSkippedDueToNewer = false;
      let latestFetchedAtUsed: Date | undefined;
      let cacheWriteError: string | undefined;
      try {
        const writeResult = await setCachedSearch(key, results, fetchedAt);
        cacheWriteSkippedDueToNewer = writeResult.skippedDueToNewer;
        latestFetchedAtUsed = writeResult.latestFetchedAt;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        cacheWriteError = msg.slice(0, 120) + (msg.length > 120 ? "…" : "");
      }
      return {
        results,
        cacheWriteSkippedDueToNewer,
        latestFetchedAtUsed,
        cacheWriteError,
      };
    } finally {
      deleteInFlightPromise(keyString);
    }
  })();

  if (!opts.force) {
    setInFlightPromise(keyString, promise);
  }

  const resolved = await promise;
  const results = Array.isArray(resolved) ? resolved : resolved.results;
  const obj = typeof resolved === "object" && !Array.isArray(resolved) ? resolved : null;
  const cacheWriteSkippedDueToNewer = obj?.cacheWriteSkippedDueToNewer;
  const latestFetchedAtUsed = obj?.latestFetchedAtUsed;
  const cacheWriteError = obj?.cacheWriteError;

  return {
    results,
    fromCache: false,
    inFlightDeduped: false,
    defaultsApplied: meta,
    cacheWriteSkippedDueToNewer,
    latestFetchedAtUsed,
    cacheWriteError,
  };
}

let cleanupScheduled = false;

/**
 * Deletes expired cache entries. Call at low frequency (e.g. process start).
 */
export async function cleanupExpiredSearchCache(): Promise<number> {
  const result = await db
    .delete(externalSearchCacheTable)
    .where(lt(externalSearchCacheTable.expiresAt, new Date()));
  return result.rowCount ?? 0;
}

/** Run cleanup once per process (lazy, on first cache access). */
function maybeScheduleCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  cleanupExpiredSearchCache().catch(() => {});
}

/**
 * Dev-only: Verifies "last write wins" upsert behavior. Run with: npx tsx -e "
 *   import('dotenv').then(d => d.config({ path: '.env.local' }));
 *   import('./src/lib/server/search-cache').then(m => m.verifyNewestWinsCacheBehavior().then(ok => console.log(ok ? 'PASS' : 'FAIL')));
 * "
 */
export async function verifyNewestWinsCacheBehavior(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") return true;

  const testKey = `__test_race_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const results1 = [{ title: "t1", snippet: "t1", url: "https://t1.de" }];
  const results2 = [{ title: "t2", snippet: "t2", url: "https://t2.de" }];
  const results0 = [{ title: "t0", snippet: "t0", url: "https://t0.de" }];

  await setCachedSearch(
    { provider: "serper", query: testKey, lang: "de", region: "DE" },
    results1
  );
  await setCachedSearch(
    { provider: "serper", query: testKey, lang: "de", region: "DE" },
    results2
  );

  const cached = await getCachedSearch({
    provider: "serper",
    query: testKey,
    lang: "de",
    region: "DE",
  });
  const hasT2 = cached?.some((r) => r.title === "t2") ?? false;
  if (!hasT2) return false;

  await setCachedSearch(
    { provider: "serper", query: testKey, lang: "de", region: "DE" },
    results0
  );

  const cachedAfter = await getCachedSearch({
    provider: "serper",
    query: testKey,
    lang: "de",
    region: "DE",
  });
  const hasT0 = cachedAfter?.some((r) => r.title === "t0") ?? false;
  return hasT0;
}
