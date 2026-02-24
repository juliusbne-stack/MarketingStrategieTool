/**
 * Types for Umfeld-Insights (External Drivers) artifact.
 * artifactKey: "pestel", UI label: "Umfeld-Insights"
 * Supports both new analyst-grade format and legacy PESTEL format.
 */

/** Trust tier from domain registry; "unclassified" for non-whitelisted sources */
export type SourceTierDisplay = "tier1" | "tier2" | "tier3" | "unclassified";

/** Trust type from domain registry; "unclassified" for non-whitelisted sources */
export type SourceTypeDisplay = string;

export type ExternalDriverSource = {
  name: string;
  url: string;
  /** ISO date YYYY-MM-DD – required for display */
  date?: string;
  domain?: string;
  /** Trust tier: from registry or "unclassified" */
  tier?: SourceTierDisplay;
  /** Trust type: from registry or "unclassified" */
  type?: SourceTypeDisplay;
};

/** Relevance of a PESTEL factor – only high/medium are shown */
export type PestelRelevance = "high" | "medium" | "low";

/** Impact type for display */
export type ImpactType = "chance" | "risk";

/** Impact level for display */
export type ImpactLevel = "high" | "medium";

/** New format: analyst-grade driver with impact, horizon, direction */
export type ExternalDriver = {
  title: string;
  /** Legacy: description; New: summary (2–3 Sätze) */
  description?: string;
  summary?: string;
  /** Ausführliche Zusammenfassung der Quellenartikel für "Mehr lesen" */
  extendedSummary?: string;
  /** Legacy */
  relevance?: string;
  implication?: string;
  /** New: 1–5 impact */
  impact?: 1 | 2 | 3 | 4 | 5;
  /** New: time horizon */
  horizon?: "now" | "3-12m" | "12m+";
  /** New: chance | risk | neutral */
  direction?: "chance" | "risk" | "neutral";
  /** New: tags */
  tags?: string[];
  /** Why this is relevant for this company – required for display */
  relevanceReason?: string;
  /** Display: chance | risk (derived from direction) */
  impactType?: ImpactType;
  /** Display: high | medium (derived from impact) */
  impactLevel?: ImpactLevel;
  /** True if from external search or explicitly validated – only these are shown */
  validated?: boolean;
  /** Concrete strategic consequence or action for the company – required for display */
  strategicImplication?: string;
  /** Unternehmen mit URL für klickbare Links – nur mit url klickbar */
  entityLinks?: Array<{ name: string; url?: string }>;
  sources: ExternalDriverSource[];
  /** Max date from sources for display (ISO YYYY-MM-DD) */
  freshestSourceDate?: string;
  /** Number of sources (for UI meta) */
  sourceCount?: number;
  /** Number of unique domains (for UI meta) */
  domainCount?: number;
  /** Confidence: high | medium | low – from calculateDriverConfidence */
  confidence?: "high" | "medium" | "low";
  /** Cluster key for navigation (from GPT or fallback: category id) */
  clusterKey?: string;
  /** Cluster title for display (from GPT or fallback: category title) */
  clusterTitle?: string;
};

export type ExternalDriversCategory = {
  id: string;
  title: string;
  summary?: string;
  /** Factor-level relevance – only high/medium shown; low = hidden */
  relevance?: PestelRelevance;
  drivers: ExternalDriver[];
  /** For navigation: same as id, used as clusterKey fallback */
  clusterKey?: string;
  /** For navigation: same as title */
  clusterTitle?: string;
};

export type ExternalDriversArtifact = {
  label?: "Externe Treiber" | "Umfeld-Insights";
  /** ISO timestamp when insights were generated */
  generatedAt?: string;
  categories: ExternalDriversCategory[];
};

import {
  normalizeDomainFromUrl,
  isDomainWhitelisted as isDomainWhitelistedRegistry,
  getAllWhitelistedDomains,
} from "./domain-registry";

/** @deprecated Use domain-registry. Re-export for backward compatibility. */
export const DOMAIN_WHITELIST = getAllWhitelistedDomains();

/** Extract domain from URL. Uses domain-registry normalizer. */
export function getDomainFromUrl(url: string): string | null {
  return normalizeDomainFromUrl(url);
}

/** Check if URL/domain is whitelisted. */
export function isDomainWhitelisted(url: string): boolean {
  return isDomainWhitelistedRegistry(url);
}

/** Source has required name, url, and date for display */
export function hasValidSource(
  src: ExternalDriverSource
): src is ExternalDriverSource & { date: string } {
  return (
    typeof src?.name === "string" &&
    typeof src?.url === "string" &&
    src.url.trim().length > 0 &&
    typeof src?.date === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(src.date.trim())
  );
}

/** Driver is displayable: has at least one source with url+date, and is validated or from external search */
export function isDisplayableDriver(
  d: ExternalDriver,
  fromExternalSearch: boolean
): boolean {
  const hasSource = (d.sources ?? []).some(hasValidSource);
  const isAllowed = fromExternalSearch || d.validated === true;
  return hasSource && isAllowed;
}

/** strategicImplication must be present and non-empty for display */
export function hasValidStrategicImplication(d: ExternalDriver): boolean {
  const s = d.strategicImplication;
  return typeof s === "string" && s.trim().length > 0;
}
