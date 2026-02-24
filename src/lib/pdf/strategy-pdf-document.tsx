/**
 * PDF Document for Marketing Strategy Export
 * Spec: cursor-plans/legacy/pdf_export.spec.json
 * Layout: A4, 14mm margins. Font: Inter if available, else Helvetica (built-in).
 * Typography: H1 22pt, H2 16pt, Body 11pt, line-height 1.35
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { humanizeValue } from "@/lib/strategy-profile-display";

// Spec: Inter preferred; fallback Helvetica. Inter requires external font files;
// in server context we use Helvetica (built-in, no network). Document in code.
const FONT_FAMILY = "Helvetica";
const styles = StyleSheet.create({
  page: {
    padding: 40, // ~14mm at 72dpi base
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 1.35,
  },
  h1: {
    fontSize: 22,
    marginBottom: 12,
    fontWeight: 700,
  },
  h2: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 700,
  },
  card: {
    border: "1.5pt solid #333",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  table: {
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 4,
    fontWeight: 700,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
  },
  unavailable: {
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#e5e5e5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 9,
  },
});

type ArtifactMap = Record<string, Record<string, unknown> | null>;

export interface StrategyPdfDocumentProps {
  projectTitle: string;
  exportDate: string;
  artifacts: ArtifactMap;
}

function getArtifact(artifacts: ArtifactMap, key: string): Record<string, unknown> | null {
  return artifacts[key] ?? null;
}

function CoverPage({ projectTitle, exportDate }: { projectTitle: string; exportDate: string }) {
  return (
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.h1}>Marketing-Strategie</Text>
        <Text style={{ marginTop: 24, fontSize: 11 }}>Projekt: {projectTitle}</Text>
        <Text style={{ marginTop: 8, fontSize: 11 }}>Exportdatum: {exportDate}</Text>
      </View>
    </Page>
  );
}

function ExecSummarySection({ artifacts }: { artifacts: ArtifactMap }) {
  const strategyProfile = getArtifact(artifacts, "strategy_profile");
  const guidelines = getArtifact(artifacts, "strategic_guidelines");
  const positioning = getArtifact(artifacts, "positioning_and_brand_core");

  const hasAny = strategyProfile || guidelines || positioning;
  if (!hasAny) {
    return (
      <Text style={styles.unavailable}>Nicht verfügbar (Phase nicht abgeschlossen)</Text>
    );
  }

  return (
    <View>
      {strategyProfile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Strategieprofil</Text>
          <Text>{String((strategyProfile.summary as Record<string, unknown>)?.one_liner ?? "—")}</Text>
          <Text style={{ marginTop: 4, fontSize: 10, color: "#555" }}>
            Marktdruck: {String((strategyProfile.summary as Record<string, unknown>)?.market_pressure ?? "—")}
          </Text>
        </View>
      )}
      {guidelines && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Strategische Leitplanken</Text>
          <Text>{String((guidelines.vision as Record<string, unknown>)?.statement ?? "—")}</Text>
        </View>
      )}
      {positioning && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Positionierung</Text>
          <Text>{String((positioning.positioning as Record<string, unknown>)?.statement ?? "—")}</Text>
        </View>
      )}
    </View>
  );
}

function ExternalDriversTable({ data }: { data: Record<string, unknown> }) {
  const categories = (data.categories as Array<{
    id: string;
    title: string;
    summary?: string;
    relevance?: "high" | "medium" | "low";
    drivers?: Array<{
      title: string;
      description?: string;
      summary?: string;
      relevanceReason?: string;
      strategicImplication?: string;
      impactType?: "chance" | "risk";
      validated?: boolean;
      sources?: Array<{ name: string; url: string; date?: string }>;
    }>;
  }>) ?? [];
  const fromExternalSearch = !!(data.generatedAt as string | undefined);
  const displayable = categories
    .filter((c) => (c.relevance ?? "medium") !== "low")
    .flatMap((cat) =>
      (cat.drivers ?? [])
        .filter((d) => (fromExternalSearch || d.validated) && (d.sources ?? []).some((s) => s.url && s.date && /^\d{4}-\d{2}-\d{2}/.test(String(s.date))))
        .filter((d) => typeof d.strategicImplication === "string" && d.strategicImplication.trim().length > 0)
        .map((d) => {
          const src = (d.sources ?? []).find((s) => s.url && s.date);
          return { cat, d, src: src as { name: string; url: string; date: string } | undefined };
        })
        .filter((x): x is typeof x & { src: { name: string; url: string; date: string } } => !!x.src)
    );
  if (displayable.length === 0) return <Text style={styles.unavailable}>Keine relevanten externen Einflussfaktoren</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Externe Treiber</Text>
      {displayable.map(({ cat, d, src }, i) => (
        <View
          key={i}
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottomWidth: i < displayable.length - 1 ? 0.5 : 0,
            borderBottomColor: "#ddd",
          }}
        >
          <Text style={{ fontWeight: 600, fontSize: 10 }}>{d.title}</Text>
          <Text style={{ marginTop: 2 }}>{d.summary ?? d.description ?? ""}</Text>
          {d.relevanceReason && (
            <Text style={{ marginTop: 2, fontSize: 10, color: "#555" }}>
              Relevanz: {d.relevanceReason}
            </Text>
          )}
          {d.impactType && (
            <Text style={{ marginTop: 2, fontSize: 10, color: "#555" }}>
              {d.impactType === "chance" ? "Chance" : "Risiko"}
            </Text>
          )}
          {d.strategicImplication && (
            <Text style={{ marginTop: 4, fontWeight: 600, fontSize: 10 }}>
              Strategische Implikation: {d.strategicImplication.trim()}
            </Text>
          )}
          {src && (
            <Text style={{ marginTop: 4, fontSize: 9, color: "#666" }}>
              Quelle: {src.name} ({src.date})
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const PORTER_FORCE_LABELS: Record<string, string> = {
  rivalry: "Wettbewerbsintensität im Markt",
  new_entrants: "Bedrohung durch neue Marktteilnehmer",
  substitutes: "Bedrohung durch Ersatzangebote",
  buyer_power: "Verhandlungsmacht der Kunden",
  supplier_power: "Verhandlungsmacht der Lieferanten",
};

function PorterTable({ data }: { data: Record<string, unknown> }) {
  const forces = (data.forces as Array<{ key?: string; label?: string; pressure: number; insights?: string[] }>) ?? [];

  if (forces.length === 0) return <Text style={styles.unavailable}>Keine Daten</Text>;

  return (
    <View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Kraft</Text>
          <Text style={styles.tableCell}>Druck</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Insights</Text>
        </View>
        {forces.map((f, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {PORTER_FORCE_LABELS[f.key ?? ""] ?? f.label ?? "—"}
            </Text>
            <Text style={styles.tableCell}>{f.pressure}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {Array.isArray(f.insights) ? f.insights.join(", ") : "—"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SwotGrid({ data }: { data: Record<string, unknown> }) {
  const strengths = (data.strengths as string[]) ?? [];
  const weaknesses = (data.weaknesses as string[]) ?? [];
  const opportunities = (data.opportunities as string[]) ?? [];
  const threats = (data.threats as string[]) ?? [];
  const cells = [
    { label: "Stärken", items: strengths.slice(0, 6) },
    { label: "Schwächen", items: weaknesses.slice(0, 6) },
    { label: "Chancen", items: opportunities.slice(0, 6) },
    { label: "Risiken", items: threats.slice(0, 6) },
  ];

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
      {cells.map((c) => (
        <View key={c.label} style={[styles.card, { width: "48%", margin: 4 }]}>
          <Text style={styles.cardTitle}>{c.label}</Text>
          {c.items.length ? c.items.map((item, i) => <Text key={i} style={{ fontSize: 10 }}>• {item}</Text>) : <Text>—</Text>}
        </View>
      ))}
    </View>
  );
}

function GroupMapTable({ data }: { data: Record<string, unknown> }) {
  const points = (data.points as Array<{ name: string; price_level: number; specialization: number; brand_strength?: number; group?: string }>) ?? [];
  if (points.length === 0) return <Text style={styles.unavailable}>Keine Daten</Text>;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, { flex: 2 }]}>Name</Text>
        <Text style={styles.tableCell}>Preisniveau</Text>
        <Text style={styles.tableCell}>Spezialisierung</Text>
        <Text style={styles.tableCell}>Markenstärke</Text>
        <Text style={styles.tableCell}>Gruppe</Text>
      </View>
      {points.map((p, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>{p.name}</Text>
          <Text style={styles.tableCell}>{p.price_level}</Text>
          <Text style={styles.tableCell}>{p.specialization}</Text>
          <Text style={styles.tableCell}>{p.brand_strength ?? "—"}</Text>
          <Text style={styles.tableCell}>{p.group ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function MixRadarTable({ data }: { data: Record<string, unknown> }) {
  const mixRadar = (data.mix_radar as Array<{ dimension: string; label: string; score: number }>) ?? [];
  if (mixRadar.length === 0) return <Text style={styles.unavailable}>Keine Daten</Text>;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, { flex: 2 }]}>Dimension</Text>
        <Text style={styles.tableCell}>Label</Text>
        <Text style={styles.tableCell}>Score</Text>
      </View>
      {mixRadar.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>{r.dimension}</Text>
          <Text style={styles.tableCell}>{r.label}</Text>
          <Text style={styles.tableCell}>{r.score}</Text>
        </View>
      ))}
    </View>
  );
}

function KanbanTables({ data }: { data: Record<string, unknown> }) {
  const kanban = (data.measures as Record<string, unknown>)?.kanban as Record<string, Array<{ name: string; goal: string; owner?: string }>> | undefined;
  const now = kanban?.now ?? [];
  const next = kanban?.next ?? [];
  const later = kanban?.later ?? [];

  const renderTable = (title: string, items: Array<{ name: string; goal: string; owner?: string }>) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.unavailable}>—</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Maßnahme</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>Ziel</Text>
            <Text style={styles.tableCell}>Owner</Text>
          </View>
          {items.map((m, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{m.name}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{m.goal}</Text>
              <Text style={styles.tableCell}>{m.owner ?? "—"}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View>
      {renderTable("Now", now)}
      {renderTable("Next", next)}
      {renderTable("Later", later)}
    </View>
  );
}

function EditorialWeekTables({ data }: { data: Record<string, unknown> }) {
  const board = data.editorial_board_4w as Record<string, Array<{ channel: string; format: string; hook: string; goal: string }>> | undefined;
  const weeks = ["week_1", "week_2", "week_3", "week_4"] as const;

  return (
    <View>
      {weeks.map((wk) => {
        const items = board?.[wk] ?? [];
        return (
          <View key={wk} style={{ marginBottom: 12 }}>
            <Text style={styles.cardTitle}>{humanizeValue(wk)}</Text>
            {items.length === 0 ? (
              <Text style={styles.unavailable}>—</Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Channel</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Format</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Hook</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Ziel</Text>
                </View>
                {items.map((item, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.channel}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.format}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.hook}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.goal}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function BriefingsListWithBadges({ data }: { data: Record<string, unknown> }) {
  const briefings = (data.briefings as Array<{ title: string; channel: string; format: string; generate_actions?: { action_id: string; label: string }[] }>) ?? [];

  return (
    <View>
      {briefings.map((b, i) => (
        <View key={i} style={[styles.card, { flexDirection: "row", flexWrap: "wrap", alignItems: "center" }]}>
          <Text style={{ flex: 1, marginBottom: 4 }}>{b.title}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={styles.badge}>{b.channel}</Text>
            <Text style={styles.badge}>{b.format}</Text>
            {(b.generate_actions ?? []).map((a) => (
              <Text key={a.action_id} style={styles.badge}>{a.label}</Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ActionPlanSection({ marketingPlan, contentPlan }: { marketingPlan: Record<string, unknown> | null; contentPlan: Record<string, unknown> | null }) {
  const kanban = (marketingPlan?.measures as Record<string, unknown>)?.kanban as Record<string, Array<{ name: string; goal: string }>> | undefined;
  const now = kanban?.now ?? [];
  const board = contentPlan?.editorial_board_4w as Record<string, Array<{ channel: string; format: string; hook: string }>> | undefined;
  const week1 = board?.week_1 ?? [];

  const rows = [
    ...now.map((m) => ({ source: "Now", name: m.name, detail: m.goal })),
    ...week1.map((w) => ({ source: "Woche 1", name: w.hook, detail: `${w.channel} / ${w.format}` })),
  ];

  if (rows.length === 0) {
    return <Text style={styles.unavailable}>Keine Daten (Phase 4/5 nicht abgeschlossen)</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableCell}>Quelle</Text>
        <Text style={[styles.tableCell, { flex: 2 }]}>Aktion</Text>
        <Text style={[styles.tableCell, { flex: 2 }]}>Detail</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.tableCell}>{r.source}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{r.name}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{r.detail}</Text>
        </View>
      ))}
    </View>
  );
}

export function StrategyPdfDocument({ projectTitle, exportDate, artifacts }: StrategyPdfDocumentProps) {
  const pestel = getArtifact(artifacts, "pestel");
  const porter = getArtifact(artifacts, "porter_5_forces");
  const swot = getArtifact(artifacts, "swot");
  const groupMap = getArtifact(artifacts, "strategic_group_map");
  const segmentation = getArtifact(artifacts, "market_segmentation");
  const targetProfiles = getArtifact(artifacts, "target_profiles");
  const guidelines = getArtifact(artifacts, "strategic_guidelines");
  const positioning = getArtifact(artifacts, "positioning_and_brand_core");
  const marketingPlan = getArtifact(artifacts, "marketing_plan");
  const contentPlan = getArtifact(artifacts, "content_plan");

  return (
    <Document>
      <CoverPage projectTitle={projectTitle} exportDate={exportDate} />

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Strategie in 60 Sekunden</Text>
        <ExecSummarySection artifacts={artifacts} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Phase 1 — Situationsanalyse</Text>
        {pestel ? <ExternalDriversTable data={pestel} /> : <Text style={styles.unavailable}>Externe Treiber: Nicht verfügbar (Phase nicht abgeschlossen)</Text>}
        {porter ? <PorterTable data={porter} /> : <Text style={styles.unavailable}>Markt- & Wettbewerbsanalyse: Nicht verfügbar</Text>}
        {swot ? <SwotGrid data={swot} /> : <Text style={styles.unavailable}>SWOT: Nicht verfügbar</Text>}
        {groupMap ? <GroupMapTable data={groupMap} /> : <Text style={styles.unavailable}>Strategisches Gruppenmapping: Nicht verfügbar</Text>}
        {segmentation ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Marktsegmente</Text>
            <Text>{String((segmentation.segments as Array<{ name: string }>)?.map((s) => s.name).join(", ") ?? "—")}</Text>
          </View>
        ) : <Text style={styles.unavailable}>Marktsegmente: Nicht verfügbar</Text>}
        {targetProfiles ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Zielgruppenprofile</Text>
            <Text>{String((targetProfiles.profiles as Array<{ name: string }>)?.map((p) => p.name).join(", ") ?? "—")}</Text>
          </View>
        ) : <Text style={styles.unavailable}>Zielgruppenprofile: Nicht verfügbar</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Phase 2 — Strategieformulierung</Text>
        {guidelines ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vision</Text>
              <Text>{String((guidelines.vision as Record<string, unknown>)?.statement ?? "—")}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mission</Text>
              <Text>{String((guidelines.mission as Record<string, unknown>)?.statement ?? "—")}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ziele-Roadmap</Text>
              <Text>Short: {String(((guidelines.goals as Record<string, string[]>)?.short_term ?? []).join("; "))}</Text>
              <Text>Mid: {String(((guidelines.goals as Record<string, string[]>)?.mid_term ?? []).join("; "))}</Text>
              <Text>Long: {String(((guidelines.goals as Record<string, string[]>)?.long_term ?? []).join("; "))}</Text>
            </View>
          </>
        ) : <Text style={styles.unavailable}>Nicht verfügbar (Phase nicht abgeschlossen)</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Phase 3 — Positionierung & Marke</Text>
        {positioning ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Positioning Canvas</Text>
              <Text>{String((positioning.positioning as Record<string, unknown>)?.statement ?? "—")}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wettbewerbsstrategie</Text>
              <Text>{String((positioning.competitive_strategy as Record<string, unknown>)?.type ?? "—")}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Markenstimme</Text>
              <Text>{String((positioning.brand as Record<string, unknown>)?.promise ?? "—")}</Text>
            </View>
          </>
        ) : <Text style={styles.unavailable}>Nicht verfügbar (Phase nicht abgeschlossen)</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Phase 4 — Marketing-Mix & Maßnahmen</Text>
        {marketingPlan ? (
          <>
            <MixRadarTable data={marketingPlan} />
            <KanbanTables data={marketingPlan} />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rahmenbedingungen</Text>
              <Text>Zeit: {String((marketingPlan.constraints as Record<string, unknown>)?.time_per_week_band ?? "—")}</Text>
              <Text>Budget: {String((marketingPlan.constraints as Record<string, unknown>)?.budget_band ?? "—")}</Text>
            </View>
          </>
        ) : <Text style={styles.unavailable}>Nicht verfügbar (Phase nicht abgeschlossen)</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Phase 5 — Content & Umsetzung</Text>
        {contentPlan ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Content-Säulen</Text>
              <Text>{String((contentPlan.pillars as Array<{ title: string }>)?.map((p) => p.title).join(", ") ?? "—")}</Text>
            </View>
            <EditorialWeekTables data={contentPlan} />
            <BriefingsListWithBadges data={contentPlan} />
          </>
        ) : <Text style={styles.unavailable}>Nicht verfügbar (Phase nicht abgeschlossen)</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Kurz-Aktionsplan</Text>
        <Text style={{ marginBottom: 8, fontSize: 10 }}>Was du als Nächstes tun solltest (Now + Woche 1)</Text>
        <ActionPlanSection marketingPlan={marketingPlan} contentPlan={contentPlan} />
      </Page>
    </Document>
  );
}
