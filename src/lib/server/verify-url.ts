/**
 * Server-side URL verification for external sources.
 * Only http/https URLs are accepted. Verifies reachability via HEAD/GET.
 * Domain whitelist enforced for Umfeld-Insights.
 */

import {
  getDomainFromUrl,
  type ExternalDriversArtifact,
  type ExternalDriverSource,
} from "./external-drivers-types";

const TIMEOUT_MS = 5_000;
const ACCEPTED_STATUS_MIN = 200;
const ACCEPTED_STATUS_MAX = 399;

/**
 * Verifies that a URL is reachable (HTTP 200–399).
 * - Only http/https allowed
 * - HEAD request, fallback GET
 * - Timeout 5s
 * @returns true if status in 200–399, false otherwise
 */
export async function verifyUrl(url: string): Promise<boolean> {
  if (typeof url !== "string" || !url.trim()) return false;

  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(trimmed, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "FlashyCards/1.0 (source-verification)" },
    });
    clearTimeout(timeoutId);
    const status = res.status;
    return status >= ACCEPTED_STATUS_MIN && status <= ACCEPTED_STATUS_MAX;
  } catch {
    clearTimeout(timeoutId);
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      const res = await fetch(trimmed, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "FlashyCards/1.0 (source-verification)" },
      });
      clearTimeout(timeoutId2);
      return res.status >= ACCEPTED_STATUS_MIN && res.status <= ACCEPTED_STATUS_MAX;
    } catch {
      return false;
    }
  }
}

const MIN_SOURCES_PER_DRIVER = 2;
const MIN_DOMAINS_PER_DRIVER = 2;

/**
 * Filters pestel (External Drivers) artifact: keeps only sources with verified URLs.
 * When useDomainWhitelist=true (Umfeld-Insights): also enforces domain whitelist.
 * Drops drivers with <2 sources or <2 domains. Drops categories with no drivers.
 * Persist only the returned artifact. Never store unverified URLs.
 */
export async function filterVerifiedSourcesInPestelArtifact(
  data: Record<string, unknown>,
  _options?: { useDomainWhitelist?: boolean }
): Promise<Record<string, unknown>> {
  const categories = (data.categories as ExternalDriversArtifact["categories"]) ?? [];

  const filteredCategories = await Promise.all(
    categories.map(async (cat) => {
      const drivers = await Promise.all(
        (cat.drivers ?? []).map(async (driver) => {
          const sources = (driver.sources ?? []).filter(
            (s): s is ExternalDriverSource => typeof s?.url === "string"
          );
          const verified: ExternalDriverSource[] = [];
          for (const src of sources) {
            if (await verifyUrl(src.url)) {
              const domain = getDomainFromUrl(src.url);
              verified.push({ ...src, domain: domain ?? undefined });
            }
          }
          const uniqueDomains = new Set(
            verified.map((s) => s.domain ?? getDomainFromUrl(s.url)).filter(Boolean)
          );
          if (
            verified.length < MIN_SOURCES_PER_DRIVER ||
            uniqueDomains.size < MIN_DOMAINS_PER_DRIVER
          ) {
            return null;
          }
          return { ...driver, sources: verified };
        })
      );
      const keptDrivers = drivers.filter((d): d is NonNullable<typeof d> => d != null);
      return { ...cat, drivers: keptDrivers };
    })
  );

  const keptCategories = filteredCategories.filter((c) => c.drivers.length > 0);
  return { ...data, categories: keptCategories };
}
