"use client";

import { useState } from "react";
import {
  PorterFiveForcesBoard,
  type PorterForce,
} from "./porter-five-forces-board";
import { PorterForceSheetContent } from "./porter-force-sheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface PorterFiveForcesSectionProps {
  data: Record<string, unknown>;
}

const FORCE_LABELS: Record<PorterForce["key"], string> = {
  rivalry: "Wettbewerbsintensität im Markt",
  new_entrants: "Bedrohung durch neue Marktteilnehmer",
  substitutes: "Bedrohung durch Ersatzangebote",
  buyer_power: "Verhandlungsmacht der Kunden",
  supplier_power: "Verhandlungsmacht der Lieferanten",
};

/** Logische Reihenfolge: Neue Marktteilnehmer → Ersatzangebote → Wettbewerb → Kunden → Lieferanten */
const FORCE_DISPLAY_ORDER: PorterForce["key"][] = [
  "new_entrants",
  "substitutes",
  "rivalry",
  "buyer_power",
  "supplier_power",
];

type RawForce = {
  key?: string;
  pressure?: number;
  insights?: string[];
  market_actors?: string[];
  strategic_insight?: string;
  source_urls?: string[];
  entity_links?: Array<{ name?: string; url?: string }>;
  detailed_analysis?: {
    stability_level?: string;
    short_summary?: string;
    competition_impact?: string;
    entry_barriers?: Array<{ name?: string; strength?: string; rationale?: string; details?: string }>;
    potential_new_entrants?: string[];
    top_substitutes?: Array<{
      name?: string;
      relevanz?: string;
      why_attractive?: string;
      examples?: string;
    }>;
    switch_triggers?: string[];
    protection_factors?: string[];
    porter_interactions?: string;
    early_indicators?: string;
    strategic_implication?: string;
  };
};

/** Baut synthetische detailed_analysis für substitutes, wenn keine vollständige Analyse vorliegt */
function buildSyntheticSubstitutesDetailedAnalysis(f: RawForce): PorterForce["detailed_analysis"] {
  const insights = Array.isArray(f.insights) ? f.insights : [];
  const pressure = Number(f.pressure) || 0;
  const level = pressure <= 30 ? "Niedrig" : pressure <= 60 ? "Mittel" : "Hoch";

  const shortSummary =
    insights[0] ||
    `Die Substitutionsgefahr wird als ${level.toLowerCase} eingestuft (${pressure}/100).`;
  const competitionImpact =
    typeof f.strategic_insight === "string" && f.strategic_insight.trim()
      ? f.strategic_insight
      : insights.length > 0
        ? insights.join(" ")
        : `Der Wettbewerbsdruck durch Substitute ist aktuell ${level.toLowerCase}.`;

  const topSubstitutes = Array.isArray(f.market_actors) && f.market_actors.length > 0
    ? f.market_actors.slice(0, 4).map((name) => ({
        name,
        relevanz: "Mittel" as const,
        why_attractive: "Aus den Quellen ableitbar – Refresh der Umfeld-Insights liefert konkrete Beispiele.",
      }))
    : [
        { name: "Inhouse/Eigenleistung", relevanz: "Mittel" as const, why_attractive: "Kunden bauen eigene Lösungen." },
        { name: "Standardanbieter", relevanz: "Mittel" as const, why_attractive: "Generalisten decken Basisbedarf." },
        { name: "Software/Automatisierung", relevanz: "Mittel" as const, why_attractive: "Tools ersetzen manuelle Prozesse." },
      ];

  return {
    stability_level: "Mittel" as const,
    short_summary: shortSummary,
    competition_impact: competitionImpact,
    top_substitutes: topSubstitutes,
    switch_triggers: [
      "Budgetdruck führt zu Kostensenkung",
      "Standardisierung macht Wechsel einfacher",
      "Interne Teams übernehmen Aufgaben",
      "Neue Regulierung erzwingt Anpassung",
    ],
    protection_factors: [
      "Wechselkosten und Integrationstiefe",
      "Compliance- und Zertifizierungsanforderungen",
      "Hohe Fehlerkosten bei Wechsel",
    ],
    porter_interactions:
      "Die Wechselwirkungen mit anderen Porter-Kräften können nach einem Refresh der Umfeld-Insights (Web-Recherche) genauer analysiert werden.",
    early_indicators:
      "Frühindikatoren für steigende Substitutionsgefahr (z. B. RFPs, Preisdruck, Tool-Adoption) werden nach einem Refresh der Umfeld-Insights aus den Quellen abgeleitet.",
    strategic_implication:
      typeof f.strategic_insight === "string" && f.strategic_insight.trim()
        ? f.strategic_insight
        : "Fokuss auf Differenzierung und Kundenbindung – z. B. durch Integrationstiefe, Compliance-Vorteile oder einzigartige Leistung. Ein Refresh der Umfeld-Insights liefert marktspezifische Empfehlungen.",
  };
}

/** Baut aus insights/market_actors/strategic_insight eine synthetische detailed_analysis für neue UI */
function buildSyntheticDetailedAnalysis(f: RawForce): PorterForce["detailed_analysis"] {
  const insights = Array.isArray(f.insights) ? f.insights : [];
  const pressure = Number(f.pressure) || 0;
  const level = pressure <= 30 ? "Niedrig" : pressure <= 60 ? "Mittel" : "Hoch";

  const shortSummary =
    insights[0] ||
    `Die Eintrittsbedrohung wird als ${level.toLowerCase} eingestuft (${pressure}/100).`;
  const competitionImpact =
    typeof f.strategic_insight === "string" && f.strategic_insight.trim()
      ? f.strategic_insight
      : insights.length > 0
        ? insights.join(" ")
        : `Der Wettbewerbsdruck durch neue Marktteilnehmer ist aktuell ${level.toLowerCase}.`;

  const genericBarriers = [
    { name: "Etablierte Marktposition", strength: "Mittel" as const, rationale: "Bestehende Anbieter haben bereits Marktanteile und Kundenbeziehungen." },
    { name: "Kapitalbedarf", strength: "Mittel" as const, rationale: "Markteintritt erfordert in der Regel Investitionen in Infrastruktur und Marketing." },
    { name: "Spezialisierung", strength: "Mittel" as const, rationale: "Branchenspezifisches Know-how erschwert den Einstieg für neue Anbieter." },
  ];
  const fromInsights = insights.slice(0, 5).map((i) => ({
    name: i.length > 60 ? i.slice(0, 57) + "…" : i,
    strength: "Mittel" as const,
    rationale: i,
  }));
  const entryBarriers =
    fromInsights.length >= 3 ? fromInsights : [...fromInsights, ...genericBarriers].slice(0, 5);

  const potentialNewEntrants = Array.isArray(f.market_actors) ? f.market_actors : [];

  return {
    stability_level: "Mittel" as const,
    short_summary: shortSummary,
    competition_impact: competitionImpact,
    entry_barriers: entryBarriers,
    potential_new_entrants:
      potentialNewEntrants.length > 0 ? potentialNewEntrants : ["Detaillierte Analyse nach Refresh der Umfeld-Insights (Web-Recherche) möglich."],
    porter_interactions:
      "Die Wechselwirkungen mit anderen Porter-Kräften können nach einem Refresh der Umfeld-Insights (Web-Recherche) genauer analysiert werden.",
    early_indicators:
      "Frühindikatoren für steigenden Eintrittsdruck (z. B. technologisch, regulatorisch) werden nach einem Refresh der Umfeld-Insights aus den Quellen abgeleitet.",
    strategic_implication:
      typeof f.strategic_insight === "string" && f.strategic_insight.trim()
        ? f.strategic_insight
        : "Fokuss auf den Ausbau von Eintrittsbarrieren – z. B. durch Spezialisierung, Kundenbindung oder Skaleneffekte. Ein Refresh der Umfeld-Insights liefert marktspezifische Empfehlungen.",
  };
}

function parseForces(data: Record<string, unknown>): PorterForce[] {
  const raw = data.forces as RawForce[] | undefined;
  const artifactSources = data.sources as Array<{ url?: string; title?: string; publisher?: string; date?: string }> | undefined;
  if (!Array.isArray(raw)) return [];

  const validKeys: PorterForce["key"][] = [
    "rivalry",
    "new_entrants",
    "substitutes",
    "buyer_power",
    "supplier_power",
  ];

  const parsed = raw
    .filter((f) => f && validKeys.includes(f.key as PorterForce["key"]))
    .map((f) => {
      const da = f.detailed_analysis;
      const isNewEntrants = f.key === "new_entrants";
      const isSubstitutes = f.key === "substitutes";

      // new_entrants: prüfe entry_barriers, potential_new_entrants
      const entryBarriers =
        Array.isArray(da?.entry_barriers) && da.entry_barriers.length >= 3
          ? da.entry_barriers
              .filter((b) => b?.name && b?.rationale && ["Niedrig", "Mittel", "Hoch"].includes(b.strength ?? ""))
              .map((b) => ({
                name: String(b.name ?? ""),
                strength: (b.strength ?? "Mittel") as "Niedrig" | "Mittel" | "Hoch",
                rationale: String(b.rationale ?? ""),
                details: b.details ? String(b.details).trim() : undefined,
              }))
          : undefined;

      const hasFullNewEntrants =
        isNewEntrants &&
        da &&
        da.short_summary &&
        da.competition_impact &&
        entryBarriers &&
        entryBarriers.length >= 3 &&
        Array.isArray(da.potential_new_entrants) &&
        da.porter_interactions &&
        da.early_indicators &&
        da.strategic_implication;

      // substitutes: prüfe top_substitutes, switch_triggers, protection_factors
      const topSubstitutes =
        Array.isArray(da?.top_substitutes) && da.top_substitutes.length >= 3
          ? da.top_substitutes
              .filter((s) => s?.name && s?.why_attractive && ["Hoch", "Mittel", "Niedrig"].includes(s.relevanz ?? ""))
              .map((s) => ({
                name: String(s.name ?? ""),
                relevanz: (s.relevanz ?? "Mittel") as "Hoch" | "Mittel" | "Niedrig",
                why_attractive: String(s.why_attractive ?? ""),
                examples: s.examples ? String(s.examples) : undefined,
              }))
          : undefined;

      const hasFullSubstitutes =
        isSubstitutes &&
        da &&
        da.short_summary &&
        da.competition_impact &&
        topSubstitutes &&
        topSubstitutes.length >= 3 &&
        Array.isArray(da.switch_triggers) &&
        da.switch_triggers.length >= 4 &&
        Array.isArray(da.protection_factors) &&
        da.protection_factors.length >= 3 &&
        da.porter_interactions &&
        da.early_indicators &&
        da.strategic_implication;

      let detailed: PorterForce["detailed_analysis"] = undefined;

      if (hasFullNewEntrants && da) {
        detailed = {
          stability_level: (da.stability_level ?? "Mittel") as "Niedrig" | "Mittel" | "Hoch",
          short_summary: da.short_summary ?? "",
          competition_impact: da.competition_impact ?? "",
          entry_barriers: entryBarriers!,
          potential_new_entrants: da.potential_new_entrants ?? [],
          porter_interactions: da.porter_interactions ?? "",
          early_indicators: da.early_indicators ?? "",
          strategic_implication: da.strategic_implication ?? "",
        };
      } else if (hasFullSubstitutes && da) {
        detailed = {
          stability_level: (da.stability_level ?? "Mittel") as "Niedrig" | "Mittel" | "Hoch",
          short_summary: da.short_summary ?? "",
          competition_impact: da.competition_impact ?? "",
          top_substitutes: topSubstitutes!,
          switch_triggers: da.switch_triggers ?? [],
          protection_factors: da.protection_factors ?? [],
          porter_interactions: da.porter_interactions ?? "",
          early_indicators: da.early_indicators ?? "",
          strategic_implication: da.strategic_implication ?? "",
        };
      } else if (isNewEntrants) {
        detailed = buildSyntheticDetailedAnalysis(f);
      } else if (isSubstitutes) {
        detailed = buildSyntheticSubstitutesDetailedAnalysis(f);
      }

      // Quellen für diese Kraft: nach source_urls filtern, sonst alle (Abwärtskompatibilität)
      const sourceUrls = Array.isArray(f.source_urls) ? f.source_urls.filter((u): u is string => typeof u === "string") : [];
      const forceSources =
        Array.isArray(artifactSources) && artifactSources.length > 0
          ? (sourceUrls.length > 0
              ? artifactSources.filter((s) => s?.url && sourceUrls.includes(s.url))
              : artifactSources
            )
              .filter((s) => s?.url && typeof s.url === "string")
              .map((s) => ({
                url: s.url!,
                title: typeof s.title === "string" ? s.title : undefined,
                publisher: typeof s.publisher === "string" ? s.publisher : undefined,
                date: typeof s.date === "string" ? s.date : undefined,
              }))
          : undefined;

      const entityLinks = Array.isArray(f.entity_links)
        ? (f.entity_links as Array<{ name?: string; url?: string }>)
            .filter((e) => e?.name && typeof e.name === "string")
            .map((e) => ({ name: e.name!, url: typeof e.url === "string" ? e.url : undefined }))
        : undefined;

      return {
        key: f.key as PorterForce["key"],
        label: FORCE_LABELS[f.key as PorterForce["key"]] ?? String(f.key ?? ""),
        pressure: Number(f.pressure) || 0,
        insights: Array.isArray(f.insights) ? f.insights : [],
        market_actors: Array.isArray(f.market_actors) ? f.market_actors : undefined,
        strategic_insight: typeof f.strategic_insight === "string" ? f.strategic_insight : undefined,
        source_urls: sourceUrls.length > 0 ? sourceUrls : undefined,
        sources: forceSources && forceSources.length > 0 ? forceSources : undefined,
        entity_links: entityLinks && entityLinks.length > 0 ? entityLinks : undefined,
        detailed_analysis: detailed,
      };
    });

  return FORCE_DISPLAY_ORDER.flatMap((key) => {
    const f = parsed.find((p) => p.key === key);
    return f ? [f] : [];
  });
}

export function PorterFiveForcesSection({ data }: PorterFiveForcesSectionProps) {
  const forces = parseForces(data);
  const [selectedForce, setSelectedForce] = useState<PorterForce | null>(null);

  if (forces.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine Daten
      </p>
    );
  }

  return (
    <>
      <PorterFiveForcesBoard
        forces={forces}
        selectedForce={selectedForce}
        onForceClick={setSelectedForce}
      />
      <Sheet
        open={!!selectedForce}
        onOpenChange={(open) => !open && setSelectedForce(null)}
      >
        <SheetContent className="flex flex-col sm:max-w-2xl overflow-hidden">
          {selectedForce && (
            <PorterForceSheetContent force={selectedForce} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
