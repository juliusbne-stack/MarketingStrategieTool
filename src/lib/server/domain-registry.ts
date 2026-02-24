/**
 * Domain Registry for Umfeld-Insights.
 * Maintainable, DE-first whitelist with tier and type for trust signals.
 * Use for whitelist enforcement, UI badges, and diagnostics.
 */

export type SourceTier = "tier1" | "tier2" | "tier3";

export type SourceType =
  | "government"
  | "statistics"
  | "central_bank"
  | "international_org"
  | "trade_association"
  | "research"
  | "industry_media"
  | "general_media"
  | "platform";

export type Locale = "DE" | "EU" | "GLOBAL";

export type DomainRule = {
  domain: string;
  type: SourceType;
  tier: SourceTier;
  locales?: Locale[];
};

/** DE-first domain registry. Extend here for whitelist expansion. */
export const DOMAIN_REGISTRY: DomainRule[] = [
  // Tier 1 – Behörden, Zentralbanken, internationale Organisationen
  { domain: "destatis.de", type: "statistics", tier: "tier1", locales: ["DE"] },
  { domain: "bundesbank.de", type: "central_bank", tier: "tier1", locales: ["DE"] },
  { domain: "ecb.europa.eu", type: "central_bank", tier: "tier1", locales: ["EU"] },
  { domain: "eurostat.ec.europa.eu", type: "statistics", tier: "tier1", locales: ["EU"] },
  { domain: "oecd.org", type: "international_org", tier: "tier1", locales: ["GLOBAL"] },
  { domain: "worldbank.org", type: "international_org", tier: "tier1", locales: ["GLOBAL"] },
  { domain: "imf.org", type: "international_org", tier: "tier1", locales: ["GLOBAL"] },
  { domain: "bmwk.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bafa.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "umweltbundesamt.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "eur-lex.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "gesetze-im-internet.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bundesanzeiger.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "kfw.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "dena.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bundesregierung.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bmwi.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bundeswirtschaftsministerium.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "bundestag.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "sachverstaendigenrat-wirtschaft.de", type: "government", tier: "tier1", locales: ["DE"] },
  { domain: "ec.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "bundesnetzagentur.de", type: "government", tier: "tier1", locales: ["DE"] },

  // Tier 1 – Weitere EU-Institutionen
  { domain: "eea.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "ema.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "esma.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "eba.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "eiopa.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "etda.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "enisa.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "fra.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },
  { domain: "cdt.europa.eu", type: "government", tier: "tier1", locales: ["EU"] },

  // Tier 2 – Research, Verbände
  { domain: "ifo.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "iwkoeln.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "zew.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "fraunhofer.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "vdi.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "vdma.org", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "zvei.org", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "bitkom.org", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "bdi.eu", type: "trade_association", tier: "tier2", locales: ["DE", "EU"] },
  { domain: "statista.com", type: "statistics", tier: "tier2", locales: ["DE", "GLOBAL"] },
  { domain: "vda.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "bdew.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "vci.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "vfa.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "bavc.de", type: "trade_association", tier: "tier2", locales: ["DE"] },

  // Tier 2 – Regionale IHKs
  { domain: "ihk-muenchen.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-berlin.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-frankfurt.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-koeln.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-hamburg.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-stuttgart.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-nuernberg.de", type: "trade_association", tier: "tier2", locales: ["DE"] },
  { domain: "ihk-dusseldorf.de", type: "trade_association", tier: "tier2", locales: ["DE"] },

  // Tier 2 – Landesbanken
  { domain: "lbb.de", type: "central_bank", tier: "tier2", locales: ["DE"] },
  { domain: "bayernlb.de", type: "central_bank", tier: "tier2", locales: ["DE"] },
  { domain: "lbbw.de", type: "central_bank", tier: "tier2", locales: ["DE"] },
  { domain: "nordlb.de", type: "central_bank", tier: "tier2", locales: ["DE"] },
  { domain: "westlb.de", type: "central_bank", tier: "tier2", locales: ["DE"] },

  // Tier 2 – Regionale Wirtschaftsförderung
  { domain: "berlin-partner.de", type: "government", tier: "tier2", locales: ["DE"] },
  { domain: "munich-startup.de", type: "government", tier: "tier2", locales: ["DE"] },
  { domain: "hamburg.de", type: "government", tier: "tier2", locales: ["DE"] },

  // Tier 2 – Akademische Quellen
  { domain: "researchgate.net", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "semanticscholar.org", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "arxiv.org", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "springer.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "sciencedirect.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "uni-muenchen.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "uni-heidelberg.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "fu-berlin.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "hu-berlin.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "tu-berlin.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "rwth-aachen.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "kit.edu", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "tum.de", type: "research", tier: "tier2", locales: ["DE"] },

  // Tier 2 – NGOs / Think Tanks
  { domain: "bertelsmann-stiftung.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "swp-berlin.org", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "diw.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "dgap.org", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "boell.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "stiftung-nv.de", type: "research", tier: "tier2", locales: ["DE"] },
  { domain: "bruegel.org", type: "research", tier: "tier2", locales: ["EU"] },
  { domain: "ceps.eu", type: "research", tier: "tier2", locales: ["EU"] },
  { domain: "chathamhouse.org", type: "research", tier: "tier2", locales: ["GLOBAL"] },

  // Tier 2/3 – Medien DE
  { domain: "handelsblatt.com", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "faz.net", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "wiwo.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "manager-magazin.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "tagesschau.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "zdf.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "heise.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "t3n.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "sueddeutsche.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "spiegel.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "zeit.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "welt.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "n-tv.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "capital.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "businessinsider.de", type: "general_media", tier: "tier2", locales: ["DE"] },
  { domain: "gruenderszene.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "golem.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "tagesanzeiger.ch", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "nzz.ch", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "derstandard.at", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "deutschlandfunk.de", type: "general_media", tier: "tier2", locales: ["DE"] },

  // Tier 2 – Research, Banken
  { domain: "wirtschaftsdienst.eu", type: "research", tier: "tier2", locales: ["EU"] },
  { domain: "helaba.com", type: "central_bank", tier: "tier2", locales: ["DE"] },

  // Tier 2/3 – Medien EU/Global
  { domain: "reuters.com", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "ft.com", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "economist.com", type: "general_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "wsj.com", type: "general_media", tier: "tier3", locales: ["GLOBAL"] },
  { domain: "bloomberg.com", type: "general_media", tier: "tier3", locales: ["GLOBAL"] },

  // Tier 2 – Research/Consulting
  { domain: "mckinsey.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "bcg.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "bain.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "deloitte.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "pwc.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "ey.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "kpmg.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "accenture.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "gartner.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "forrester.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "idc.com", type: "research", tier: "tier2", locales: ["GLOBAL"] },

  // Tier 2/3 – Tech & Industry
  { domain: "techcrunch.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "theverge.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "arstechnica.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "wired.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "zdnet.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "cnet.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "venturebeat.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },

  // Tier 2 – Branchenspezifische Medien (Pharma, Energie, Automotive)
  { domain: "pharmazeutische-zeitung.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "apotheke-adhoc.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "pharmabiz.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "fiercepharma.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "energate-messenger.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "pv-magazine.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "renewableenergyworld.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },
  { domain: "automobilwoche.de", type: "industry_media", tier: "tier2", locales: ["DE"] },
  { domain: "automotive-news.com", type: "industry_media", tier: "tier2", locales: ["GLOBAL"] },

  // Reference / Plattformen
  { domain: "wikipedia.org", type: "platform", tier: "tier3", locales: ["GLOBAL"] },
  { domain: "de.wikipedia.org", type: "platform", tier: "tier3", locales: ["DE"] },
  { domain: "en.wikipedia.org", type: "platform", tier: "tier3", locales: ["GLOBAL"] },
  { domain: "scholar.google.com", type: "platform", tier: "tier3", locales: ["GLOBAL"] },
];

const domainToRule = new Map<string, DomainRule>();
for (const r of DOMAIN_REGISTRY) {
  domainToRule.set(r.domain.toLowerCase(), r);
}

/** Normalize URL to domain (lowercase, no www). */
export function normalizeDomainFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) return host.slice(4);
    return host;
  } catch {
    return null;
  }
}

/** Get domain rule if whitelisted. Supports subdomains: economy.handelsblatt.com matches handelsblatt.com. */
export function getDomainRule(domainOrUrl: string): DomainRule | null {
  const domain =
    domainOrUrl.includes("/") || domainOrUrl.includes(".")
      ? normalizeDomainFromUrl(domainOrUrl)
      : domainOrUrl.toLowerCase();
  if (!domain) return null;
  const exact = domainToRule.get(domain);
  if (exact) return exact;
  for (const rule of DOMAIN_REGISTRY) {
    const reg = rule.domain.toLowerCase();
    if (domain === reg || domain.endsWith("." + reg)) return rule;
  }
  return null;
}

/** Check if domain/URL is whitelisted. */
export function isDomainWhitelisted(domainOrUrl: string): boolean {
  return getDomainRule(domainOrUrl) != null;
}

/** Human-readable labels for UI badges. */
export function getDomainLabels(domainOrUrl: string): {
  typeLabel: string;
  tierLabel: string;
} | null {
  const rule = getDomainRule(domainOrUrl);
  if (!rule) return null;

  const typeLabels: Record<SourceType, string> = {
    government: "Behörde",
    statistics: "Statistik",
    central_bank: "Zentralbank",
    international_org: "Internationale Org.",
    trade_association: "Verband",
    research: "Institut",
    industry_media: "Branchenmedium",
    general_media: "Leitmedium",
    platform: "Plattform",
  };

  const tierLabels: Record<SourceTier, string> = {
    tier1: "Tier 1",
    tier2: "Tier 2",
    tier3: "Tier 3",
  };

  return {
    typeLabel: typeLabels[rule.type] ?? rule.type,
    tierLabel: tierLabels[rule.tier] ?? rule.tier,
  };
}

/** All whitelisted domains (for backward compatibility). */
export function getAllWhitelistedDomains(): Set<string> {
  return new Set(DOMAIN_REGISTRY.map((r) => r.domain));
}
