/**
 * Optional publishedAt extraction fallback when search provider doesn't return dates.
 * 1. Try URL path patterns (/2024/01/15/, /2025-01/, etc.)
 * 2. Fetches page (GET, 5s timeout, max ~100KB), parses JSON-LD datePublished, then meta tags.
 * Only returns date if plausible (reasonable year).
 */

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 100_000; // ~100KB
const MIN_YEAR = 2015;
const MAX_YEAR = new Date().getFullYear() + 1;

function isPlausibleDate(str: string): boolean {
  const yyyyFirst = str.match(/^(\d{4})/);
  if (yyyyFirst) {
    const year = parseInt(yyyyFirst[1], 10);
    return !isNaN(year) && year >= MIN_YEAR && year <= MAX_YEAR;
  }
  const ddMmYyyy = str.match(/(\d{4})$/);
  if (ddMmYyyy) {
    const year = parseInt(ddMmYyyy[1], 10);
    return !isNaN(year) && year >= MIN_YEAR && year <= MAX_YEAR;
  }
  return false;
}

/** Normalize date string to YYYY-MM-DD. Exported for use when search provider returns DD.MM.YYYY etc. */
export function normalizeDateToYyyyMmDd(val: string): string | null {
  const trimmed = val.trim();
  if (trimmed.length < 8) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const deMatch = trimmed.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (deMatch) {
    const [, d, m, y] = deMatch;
    const year = parseInt(y, 10);
    if (year < 2015 || year > new Date().getFullYear() + 1) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const usMatch = trimmed.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    const year = parseInt(y, 10);
    if (year < 2015 || year > new Date().getFullYear() + 1) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Normalize to YYYY-MM-DD for consistent validation downstream */
function normalizeToYyyyMmDd(val: string): string {
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const deMatch = val.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (deMatch) {
    const [, d, m, y] = deMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const usMatch = val.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return val;
}

function extractDateFromString(val: unknown): string | null {
  if (typeof val !== "string" || val.length < 10) return null;
  const trimmed = val.trim();
  if (!isPlausibleDate(trimmed)) return null;
  return normalizeToYyyyMmDd(trimmed);
}

function extractFromJsonLd(html: string): string | null {
  const scriptMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scriptMatch) return null;

  for (const block of scriptMatch) {
    const contentMatch = block.match(
      /<script[^>]*>([\s\S]*?)<\/script>/i
    );
    const content = contentMatch?.[1]?.trim();
    if (!content) continue;

    try {
      let parsed: unknown;
      if (content.startsWith("[")) {
        const arr = JSON.parse(content) as unknown[];
        parsed = arr[0];
      } else {
        parsed = JSON.parse(content);
      }
      const obj = parsed as Record<string, unknown>;
      const date =
        obj.datePublished ??
        (obj as { dateModified?: unknown }).dateModified ??
        (obj as { "@graph"?: Array<Record<string, unknown>> })["@graph"]?.[0]
          ?.datePublished;
      const result = extractDateFromString(date);
      if (result) return result;
    } catch {
      continue;
    }
  }
  return null;
}

function extractFromMeta(html: string): string | null {
  const patterns = [
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i,
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']date["']/i,
    /<meta[^>]*name=["']publishdate["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const result = extractDateFromString(m[1]);
      if (result) return result;
    }
  }
  return null;
}

/** Extract YYYY-MM-DD from URL path. Matches anywhere in path. */
function extractFromUrlPath(url: string): string | null {
  const fullMatch = url.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (fullMatch) {
    const [, y, m, d] = fullMatch;
    const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isPlausibleDate(date) ? date : null;
  }
  const ymdDashMatch = url.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymdDashMatch) {
    const [, y, m, d] = ymdDashMatch;
    const date = `${y}-${m}-${d}`;
    return isPlausibleDate(date) ? date : null;
  }
  const yearMonthMatch = url.match(/(\d{4})[\/\-](\d{1,2})(?:\/|$|\?|\.|-)/);
  if (yearMonthMatch) {
    const [, y, m] = yearMonthMatch;
    const date = `${y}-${m.padStart(2, "0")}-01`;
    return isPlausibleDate(date) ? date : null;
  }
  const yearOnlyMatch = url.match(/(\d{4})(?:\/|$|\?|\.|-)/);
  if (yearOnlyMatch) {
    const date = `${yearOnlyMatch[1]}-01-01`;
    return isPlausibleDate(date) ? date : null;
  }
  return null;
}

/**
 * Fetches a URL and extracts publishedAt from JSON-LD or meta tags.
 * Falls back to URL path extraction first (no fetch).
 * Returns null on any error or if no plausible date found.
 */
export async function extractPublishedAtFromUrl(url: string): Promise<string | null> {
  if (typeof url !== "string" || !url.trim().startsWith("http")) return null;

  const fromPath = extractFromUrlPath(url);
  if (fromPath) return fromPath;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.trim(), {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FlashyCards/1.0; +https://github.com)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    let total = 0;
    const decoder = new TextDecoder("utf-8", { fatal: false });

    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    const fromJsonLd = extractFromJsonLd(html);
    if (fromJsonLd) return fromJsonLd;

    const fromMeta = extractFromMeta(html);
    return fromMeta;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
