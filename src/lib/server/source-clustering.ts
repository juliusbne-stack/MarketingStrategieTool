/**
 * Source clustering for Umfeld-Insights.
 * Clusters sources by semantic similarity (Jaccard over keywords) before GPT.
 * Ensures domain diversity per cluster for minDomainsRequired.
 */

import type { SearchResult } from "./search-provider";
import { normalizeDomainFromUrl } from "./domain-registry";

const JACCARD_THRESHOLD = 0.4;
const MAX_SOURCES_PER_CLUSTER = 6;

/** Basic DE+EN stopwords for tokenization. */
const STOPWORDS = new Set([
  "der", "die", "das", "und", "ist", "für", "von", "mit", "auf", "zu", "bei",
  "the", "and", "for", "with", "from", "are", "was", "has", "have", "had",
  "ein", "eine", "einer", "eines", "a", "an", "of", "to", "in", "on", "at",
  "sich", "nicht", "auch", "als", "nach", "bei", "bis", "durch", "gegen",
  "über", "unter", "um", "oder", "aber", "sondern", "denn", "weil", "wenn",
  "dass", "ob", "wie", "was", "wer", "welche", "welcher", "welches",
  "this", "that", "these", "those", "it", "its", "they", "them", "their",
  "2024", "2023", "2025", "deutschland", "germany", "eu", "europa", "europe",
]);

function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(normalized);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export type ClusteredSource = SearchResult & { domain: string };

export type SourceCluster = {
  id: string;
  title: string;
  summary: string;
  sources: ClusteredSource[];
};

/**
 * Cluster sources by Jaccard similarity over title+snippet keywords.
 * Prioritizes domain diversity: max 6 sources per cluster, prefer different domains.
 */
export function clusterSources(
  sources: Array<SearchResult & { domain: string }>
): SourceCluster[] {
  if (sources.length === 0) return [];

  const tokensPerSource = sources.map((s) => ({
    source: s,
    tokens: new Set([
      ...tokenize(s.title ?? ""),
      ...tokenize(s.snippet ?? ""),
    ]),
  }));

  const assigned = new Set<number>();
  const clusters: SourceCluster[] = [];
  let clusterId = 0;

  for (let i = 0; i < tokensPerSource.length; i++) {
    if (assigned.has(i)) continue;

    const seed = tokensPerSource[i];
    const clusterSources: ClusteredSource[] = [seed.source];
    assigned.add(i);

    const clusterDomains = new Set([seed.source.domain]);

    for (let j = i + 1; j < tokensPerSource.length && clusterSources.length < MAX_SOURCES_PER_CLUSTER; j++) {
      if (assigned.has(j)) continue;

      const cand = tokensPerSource[j];
      const sim = jaccard(seed.tokens, cand.tokens);
      if (sim < JACCARD_THRESHOLD) continue;

      // Prefer domain diversity: if we already have this domain, only add if we have room and high sim
      const hasDomain = clusterDomains.has(cand.source.domain);
      if (hasDomain && clusterSources.length >= 2) continue;

      clusterSources.push(cand.source);
      clusterDomains.add(cand.source.domain);
      assigned.add(j);
    }

    const title = seed.source.title?.slice(0, 80) ?? "Cluster";
    const summary = clusterSources
      .map((s) => s.snippet?.slice(0, 100))
      .filter(Boolean)
      .join(" ")
      .slice(0, 200);

    clusters.push({
      id: `cluster_${clusterId++}`,
      title,
      summary: summary.trim() || title,
      sources: clusterSources,
    });
  }

  return clusters;
}
