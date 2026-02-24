/**
 * Web Search Provider Adapter for Umfeld-Insights.
 * Provider selected via SEARCH_PROVIDER env (serper | brave | serpapi | custom).
 * SEARCH_API_KEY required when provider is configured.
 */

/** Error code when search is not configured - use for graceful UI handling */
export const SEARCH_NOT_CONFIGURED = "SEARCH_NOT_CONFIGURED";

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  publishedAt?: string;
  source?: string;
  publisher?: string;
  /** Unified source/publisher name for display */
  sourceName?: string;
  /** organic | news – for diagnostics */
  kind?: "organic" | "news";
};

/** Per-request diagnostics (SerpApi). Filled when diagnosticsRef passed in options. */
export type SearchRequestDiagnostics = {
  totalTookMs: number;
  retriesCount: number;
  timeoutsCount: number;
  perRequest: Array<{
    kind: "google" | "news";
    queryShort: string;
    ok: boolean;
    tookMs: number;
    retries: number;
    resultCount: number;
    errorShort?: string;
  }>;
};

export type SearchOptions = {
  lang?: "de" | "en";
  region?: "DE" | "GLOBAL";
  numResults?: number;
  /** Dev only: when true, SerpApi additionally fetches engine=google_news for fresh news */
  force?: boolean;
  /** SerpApi: optional ref to collect per-request diagnostics */
  diagnosticsRef?: { current: SearchRequestDiagnostics };
};

export type SearchProvider = {
  searchWeb(query: string, options?: SearchOptions): Promise<SearchResult[]>;
};

function getProvider(): SearchProvider | null {
  const provider = process.env.SEARCH_PROVIDER?.toLowerCase();
  const apiKey = process.env.SEARCH_API_KEY?.trim();

  if (!provider || !apiKey) return null;

  switch (provider) {
    case "serper":
      return createSerperProvider(apiKey);
    case "brave":
      return createBraveProvider(apiKey);
    case "serpapi":
      return createSerpApiProvider(apiKey);
    default:
      return null;
  }
}

/** Returns the configured search provider or throws SEARCH_NOT_CONFIGURED if not configured */
export function getSearchProvider(): SearchProvider {
  const p = getProvider();
  if (!p) {
    const err = new Error(
      "Search not configured. Set SEARCH_PROVIDER (serper|brave|serpapi) and SEARCH_API_KEY in environment."
    );
    (err as Error & { code?: string }).code = SEARCH_NOT_CONFIGURED;
    throw err;
  }
  return p;
}

/** Returns provider name for diagnostics, or null if not configured */
export function getSearchProviderName(): string | null {
  const provider = process.env.SEARCH_PROVIDER?.toLowerCase();
  const apiKey = process.env.SEARCH_API_KEY?.trim();
  if (!provider || !apiKey) return null;
  if (provider === "serper" || provider === "brave" || provider === "serpapi") return provider;
  return null;
}

/** Returns fallback provider when primary fails with 401/403. E.g. Serper/SerpApi→Brave when BRAVE_API_KEY set. */
export function getFallbackProvider(): SearchProvider | null {
  const primary = process.env.SEARCH_PROVIDER?.toLowerCase();
  const fallback = process.env.SEARCH_PROVIDER_FALLBACK?.toLowerCase();
  const braveKey = process.env.BRAVE_API_KEY?.trim();
  if ((primary === "serper" || primary === "serpapi") && fallback === "brave" && braveKey) {
    return createBraveProvider(braveKey);
  }
  return null;
}

/** Returns fallback provider name for diagnostics */
export function getFallbackProviderName(): string | null {
  const primary = process.env.SEARCH_PROVIDER?.toLowerCase();
  const fallback = process.env.SEARCH_PROVIDER_FALLBACK?.toLowerCase();
  const braveKey = process.env.BRAVE_API_KEY?.trim();
  if ((primary === "serper" || primary === "serpapi") && fallback === "brave" && braveKey) return "brave";
  return null;
}

/** Check if search is configured (for UI) */
export function isSearchConfigured(): boolean {
  return getProvider() !== null;
}

/** Dev-only: ENV status for diagnostics. Never logs the actual key. */
export type EnvStatusDiagnostics = {
  searchProviderSet: boolean;
  apiKeyPresent: boolean;
  apiKeyLength: number;
  endpointUsed: string;
  providerName: string;
  runtime: "node" | "edge" | "unknown";
};

const SERPER_ENDPOINT = "https://google.serper.dev/search";
const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export function getEnvStatusDiagnostics(): EnvStatusDiagnostics {
  const hasProcessEnv =
    typeof process !== "undefined" && process?.env != null;
  const runtime: EnvStatusDiagnostics["runtime"] = hasProcessEnv
    ? "node"
    : "edge";

  const provider = hasProcessEnv
    ? process.env.SEARCH_PROVIDER?.trim()?.toLowerCase()
    : undefined;
  const searchProviderSet = !!provider && provider.length > 0;

  const apiKey = hasProcessEnv ? process.env.SEARCH_API_KEY?.trim() : undefined;
  const apiKeyPresent = !!apiKey;
  const apiKeyLength = apiKey ? apiKey.length : 0;

  const providerName = provider === "serper" || provider === "brave" || provider === "serpapi" ? provider : "unknown";
  const endpointUsed =
    provider === "serper"
      ? SERPER_ENDPOINT
      : provider === "brave"
        ? BRAVE_ENDPOINT
        : provider === "serpapi"
          ? "https://serpapi.com/search.json"
          : "—";

  return {
    searchProviderSet,
    apiKeyPresent,
    apiKeyLength,
    endpointUsed,
    providerName,
    runtime,
  };
}

/** Check if error is SEARCH_NOT_CONFIGURED (for graceful handling) */
export function isSearchNotConfiguredError(err: unknown): boolean {
  if (err instanceof Error && (err as Error & { code?: string }).code === SEARCH_NOT_CONFIGURED)
    return true;
  return err instanceof Error && err.message.includes("Search not configured");
}

const SERPER_UNAUTHORIZED_MSG =
  "SERPER_UNAUTHORIZED: SEARCH_API_KEY wird nicht akzeptiert oder fehlt. Prüfe ENV + Serper Dashboard.";

const SERPAPI_UNAUTHORIZED_MSG =
  "SERPAPI_UNAUTHORIZED: SEARCH_API_KEY wird nicht akzeptiert oder fehlt. Prüfe ENV + SerpApi Dashboard.";

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
const SERPAPI_TIMEOUT_DEV_MS = 25_000;
const SERPAPI_TIMEOUT_PROD_MS = 15_000;
const SERPAPI_MAX_RETRIES = 2;
const SERPAPI_BACKOFF_MS = [500, 1500];

function isRetryableSerpApiError(err: unknown, status?: number): boolean {
  if (status && (status === 401 || status === 403)) return false;
  if (status && status >= 500) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("aborted") ||
    msg.includes("Abort") ||
    msg.includes("Timeout") ||
    msg.includes("timeout") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNRESET")
  );
}

function shortenQuery(q: string, maxLen = 40): string {
  const s = q.trim();
  return s.length <= maxLen ? s : s.slice(0, maxLen) + "…";
}

/** Normalize SerpAPI date to ISO YYYY-MM-DD when possible */
function normalizeSerpApiDate(dateStr: string | undefined, isoDate: string | undefined): string | undefined {
  if (isoDate && /^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate.slice(0, 10);
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  return dateStr ?? isoDate;
}

type SerpApiFetchResult =
  | { ok: true; response: Response; tookMs: number; retriesUsed: number }
  | { ok: false; error: Error; tookMs: number; retriesUsed: number; errorShort: string };

/** Single SerpAPI request with retry. Per-request AbortController. */
async function serpApiFetchWithRetry(
  url: string,
  timeoutMs: number,
  diag: { retries: number; timeouts: number }
): Promise<SerpApiFetchResult> {
  let lastErr: Error | undefined;
  let lastTookMs = 0;
  for (let attempt = 0; attempt <= SERPAPI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      diag.timeouts++;
    }, timeoutMs);
    const start = Date.now();
    try {
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      lastTookMs = Date.now() - start;
      if (res.status === 401 || res.status === 403) {
        throw new Error(SERPAPI_UNAUTHORIZED_MSG);
      }
      if (res.ok) {
        return { ok: true, response: res, tookMs: lastTookMs, retriesUsed: attempt };
      }
      lastErr = new Error(`SERPAPI_FAILED: ${res.status}`);
      if (res.status >= 500 && attempt < SERPAPI_MAX_RETRIES) {
        diag.retries++;
        await new Promise((r) => setTimeout(r, SERPAPI_BACKOFF_MS[attempt] ?? 1500));
        continue;
      }
      return {
        ok: false,
        error: lastErr,
        tookMs: lastTookMs,
        retriesUsed: attempt,
        errorShort: `HTTP ${res.status}`,
      };
    } catch (e) {
      clearTimeout(timeoutId);
      lastTookMs = Date.now() - start;
      const isAbort = e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted"));
      if (isAbort) diag.timeouts++;
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (!isRetryableSerpApiError(e)) {
        throw lastErr;
      }
      diag.retries++;
      if (attempt < SERPAPI_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, SERPAPI_BACKOFF_MS[attempt] ?? 1500));
      } else {
        return {
          ok: false,
          error: lastErr,
          tookMs: lastTookMs,
          retriesUsed: attempt,
          errorShort: isAbort ? "Timeout/Abort" : lastErr.message.slice(0, 60),
        };
      }
    }
  }
  throw lastErr ?? new Error("SERPAPI_FAILED: Unknown error");
}

/** SerpAPI - Google Search + optional Google News (extra engine=google_news call) */
function createSerpApiProvider(apiKey: string): SearchProvider {
  const isDev = process.env.NODE_ENV === "development";
  const timeoutMs = isDev ? SERPAPI_TIMEOUT_DEV_MS : SERPAPI_TIMEOUT_PROD_MS;

  return {
    async searchWeb(query: string, options?: SearchOptions): Promise<SearchResult[]> {
      const num = Math.min(options?.numResults ?? 10, 100);
      const gl = options?.region === "DE" ? "de" : "us";
      const hl = options?.lang === "de" ? "de" : "en";
      const queryShort = shortenQuery(query);
      const diagRef = options?.diagnosticsRef;
      const perRequest: SearchRequestDiagnostics["perRequest"] = [];
      const diagState = { retries: 0, timeouts: 0 };

      const totalStart = Date.now();
      const results: SearchResult[] = [];

      const params = new URLSearchParams({
        engine: "google",
        q: query,
        api_key: apiKey,
        hl,
        gl,
        num: String(num),
      });

      const fetchResult = await serpApiFetchWithRetry(
        `${SERPAPI_ENDPOINT}?${params}`,
        timeoutMs,
        diagState
      );

      if (!fetchResult.ok) {
        perRequest.push({
          kind: "google",
          queryShort,
          ok: false,
          tookMs: fetchResult.tookMs,
          retries: fetchResult.retriesUsed,
          resultCount: 0,
          errorShort: fetchResult.errorShort,
        });
        if (diagRef) {
          diagRef.current = {
            totalTookMs: Date.now() - totalStart,
            retriesCount: diagState.retries,
            timeoutsCount: diagState.timeouts,
            perRequest,
          };
        }
        throw fetchResult.error;
      }

      const res = fetchResult.response;
      const data = (await res.json()) as {
        error?: string;
        organic_results?: Array<{
          title?: string;
          snippet?: string;
          link?: string;
          date?: string;
          source?: string;
        }>;
        news_results?: Array<{
          title?: string;
          snippet?: string;
          link?: string;
          date?: string;
          iso_date?: string;
          source?: string | { name?: string };
        }>;
        top_stories?: Array<{
          title?: string;
          link?: string;
          source?: string;
        }>;
      };

      if (data.error) {
        throw new Error(`SERPAPI_FAILED: ${data.error}`);
      }

      const organic = data.organic_results ?? [];
      for (const o of organic) {
        const url = o.link ?? "";
        if (!url) continue;
        results.push({
          title: o.title ?? "",
          snippet: o.snippet ?? "",
          url,
          date: o.date,
          publishedAt: o.date,
          source: o.source,
          publisher: o.source,
          sourceName: o.source,
          kind: "organic",
        });
      }

      const newsItems = data.news_results ?? [];
      for (const n of newsItems) {
        const url = n.link ?? "";
        if (!url) continue;
        const sourceName = typeof n.source === "string" ? n.source : n.source?.name;
        const publishedAt = normalizeSerpApiDate(n.date, n.iso_date);
        results.push({
          title: n.title ?? "",
          snippet: (n as { snippet?: string }).snippet ?? "",
          url,
          date: publishedAt,
          publishedAt,
          source: sourceName,
          publisher: sourceName,
          sourceName,
          kind: "news",
        });
      }

      const organicCount = organic.length;
      const newsFromGoogle = newsItems.length;
      const googleResultCount = organicCount + newsFromGoogle;

      perRequest.push({
        kind: "google",
        queryShort,
        ok: true,
        tookMs: fetchResult.tookMs,
        retries: fetchResult.retriesUsed,
        resultCount: googleResultCount,
      });

      const shouldFetchNews =
        (!isDev || (isDev && options?.force)) &&
        results.length < num &&
        organic.length > 0;

      if (shouldFetchNews) {
        const newsParams = new URLSearchParams({
          engine: "google_news",
          q: query,
          api_key: apiKey,
          hl,
          gl,
        });
        const newsFetchResult = await serpApiFetchWithRetry(
          `${SERPAPI_ENDPOINT}?${newsParams}`,
          timeoutMs,
          diagState
        );
        let newsResultCount = 0;
        if (newsFetchResult.ok) {
          const newsData = (await newsFetchResult.response.json()) as {
            error?: string;
            news_results?: Array<{
              title?: string;
              snippet?: string;
              link?: string;
              date?: string;
              iso_date?: string;
              source?: string | { name?: string };
            }>;
          };
          if (!newsData.error && newsData.news_results) {
            const seenUrls = new Set(results.map((r) => r.url));
            for (const n of newsData.news_results) {
              const url = n.link ?? "";
              if (!url || seenUrls.has(url)) continue;
              seenUrls.add(url);
              const sourceName = typeof n.source === "string" ? n.source : n.source?.name;
              const publishedAt = normalizeSerpApiDate(n.date, n.iso_date);
              results.push({
                title: n.title ?? "",
                snippet: n.snippet ?? "",
                url,
                date: publishedAt,
                publishedAt,
                source: sourceName,
                publisher: sourceName,
                sourceName,
                kind: "news",
              });
            }
            newsResultCount = newsData.news_results.length;
          }
          perRequest.push({
            kind: "news",
            queryShort,
            ok: true,
            tookMs: newsFetchResult.tookMs,
            retries: newsFetchResult.retriesUsed,
            resultCount: newsResultCount,
          });
        } else {
          if (newsFetchResult.error.message.includes("SERPAPI_UNAUTHORIZED")) {
            throw newsFetchResult.error;
          }
          perRequest.push({
            kind: "news",
            queryShort,
            ok: false,
            tookMs: newsFetchResult.tookMs,
            retries: newsFetchResult.retriesUsed,
            resultCount: 0,
            errorShort: newsFetchResult.errorShort,
          });
        }
      }

      if (diagRef) {
        diagRef.current = {
          totalTookMs: Date.now() - totalStart,
          retriesCount: diagState.retries,
          timeoutsCount: diagState.timeouts,
          perRequest,
        };
      }

      return results;
    },
  };
}

/** Serper.dev - Google Search API */
function createSerperProvider(apiKey: string): SearchProvider {
  return {
    async searchWeb(query: string, options?: SearchOptions): Promise<SearchResult[]> {
      const num = Math.min(options?.numResults ?? 10, 100);
      const gl = options?.region === "DE" ? "de" : "us";
      const hl = options?.lang === "de" ? "de" : "en";

      const res = await fetch(SERPER_ENDPOINT, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, gl, hl, num }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(SERPER_UNAUTHORIZED_MSG);
        }
        const err = await res.text();
        throw new Error(`Serper search failed: ${res.status} ${err}`);
      }

      const data = (await res.json()) as {
        organic?: Array<{
          title?: string;
          snippet?: string;
          link?: string;
          date?: string;
          source?: string;
        }>;
      };

      const organic = data.organic ?? [];
      return organic.map((o) => ({
        title: o.title ?? "",
        snippet: o.snippet ?? "",
        url: o.link ?? "",
        date: o.date,
        publishedAt: o.date,
        source: o.source,
        publisher: o.source,
      }));
    },
  };
}

/** Brave Search API */
function createBraveProvider(apiKey: string): SearchProvider {
  return {
    async searchWeb(query: string, options?: SearchOptions): Promise<SearchResult[]> {
      const count = Math.min(options?.numResults ?? 10, 20);
      const country = options?.region === "DE" ? "DE" : "US";
      const lang = options?.lang === "de" ? "de" : "en";

      const params = new URLSearchParams({
        q: query,
        count: String(count),
        country,
        search_lang: lang,
      });

      const res = await fetch(`${BRAVE_ENDPOINT}?${params}`, {
        method: "GET",
        headers: {
          "X-Subscription-Token": apiKey,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Brave search failed: ${res.status} ${err}`);
      }

      const data = (await res.json()) as {
        web?: {
          results?: Array<{
            title?: string;
            description?: string;
            url?: string;
            age?: string;
            profile?: { name?: string };
          }>;
        };
      };

      const results = data.web?.results ?? [];
      return results.map((r) => ({
        title: r.title ?? "",
        snippet: r.description ?? "",
        url: r.url ?? "",
        date: r.age,
        publishedAt: r.age,
        source: r.profile?.name,
        publisher: r.profile?.name,
      }));
    },
  };
}
