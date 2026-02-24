"use client";

import {
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StrategyProfileCard } from "@/components/strategy-profile/strategy-profile-card";
import { ExternalDriversSection } from "@/components/external-drivers/external-drivers-section";
import { PorterFiveForcesSection } from "@/components/porter-five-forces/porter-five-forces-section";
import type { Artifact } from "./types";
import type { ExternalInsightMeta } from "@/app/actions/external-insight-actions";

interface ResultsDashboardProps {
  artifacts: Artifact[];
  isLocked?: boolean;
  /** When false, hide strategy_profile_hero (used in Final Dashboard Phase 1 section) */
  showStrategyProfile?: boolean;
  /** For Umfeld-Insights refresh button */
  projectId?: number;
  externalInsightMeta?: ExternalInsightMeta | null;
}

function getArtifact(artifacts: Artifact[], key: string): Record<string, unknown> | null {
  const a = artifacts.find((x) => x.artifactKey === key);
  return a ? (a.data as Record<string, unknown>) : null;
}

function SwotGrid({ data }: { data: Record<string, unknown> }) {
  const strengths = (data.strengths as string[]) ?? [];
  const weaknesses = (data.weaknesses as string[]) ?? [];
  const opportunities = (data.opportunities as string[]) ?? [];
  const threats = (data.threats as string[]) ?? [];
  const cells = [
    { key: "strengths", label: "Stärken", items: strengths.slice(0, 6) },
    { key: "weaknesses", label: "Schwächen", items: weaknesses.slice(0, 6) },
    { key: "opportunities", label: "Chancen", items: opportunities.slice(0, 6) },
    { key: "threats", label: "Risiken", items: threats.slice(0, 6) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>SWOT</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {cells.map((c) => (
            <div key={c.key} className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">{c.label}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {c.items.length ? c.items.map((item, i) => <li key={i}>{item}</li>) : <li>—</li>}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GroupMapScatter({ data }: { data: Record<string, unknown> }) {
  const points = (data.points as Array<{ name: string; price_level: number; specialization: number; brand_strength?: number; group?: string; is_self?: boolean }>) ?? [];
  const chartData = points.map((p) => ({
    x: Number(p.price_level) || 0,
    y: Number(p.specialization) || 0,
    z: Number(p.brand_strength) || 50,
    name: p.name,
    isSelf: !!p.is_self,
  }));

  if (chartData.length === 0) return <Card><CardHeader><CardTitle>Strategisches Gruppenmapping</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Noch keine Daten</p></CardContent></Card>;

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategisches Gruppenmapping</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ maxHeight: 360 }}>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name="Preisniveau" domain={[0, 100]} />
              <YAxis type="number" dataKey="y" name="Spezialisierung" domain={[0, 100]} />
              <ZAxis type="number" dataKey="z" range={[100, 400]} name="Markenstärke" />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-md border bg-popover p-2 text-sm">
                      <p className="font-medium">{payload[0].payload.name} {payload[0].payload.isSelf && "(Sie)"}</p>
                      <p>Preisniveau: {payload[0].payload.x}</p>
                      <p>Spezialisierung: {payload[0].payload.y}</p>
                    </div>
                  ) : null
                }
              />
              <Scatter data={chartData} fill="hsl(var(--chart-1))">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isSelf ? "hsl(var(--primary))" : COLORS[i % COLORS.length]} stroke={entry.isSelf ? "hsl(var(--primary))" : undefined} strokeWidth={entry.isSelf ? 3 : 0} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentationCards({ data }: { data: Record<string, unknown> }) {
  const segments = (data.segments as Array<{ name?: string; who?: string; need?: string; attractiveness?: string }>) ?? [];

  if (segments.length === 0) return <Card><CardHeader><CardTitle>Marktsegmente</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Noch keine Daten</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marktsegmente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((s, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.name ?? "Segment"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="font-medium">Wer:</span> {s.who ?? "—"}</p>
                <p><span className="font-medium">Bedarf:</span> {s.need ?? "—"}</p>
                <p><span className="font-medium">Attraktivität:</span> {s.attractiveness ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetProfileCards({ data }: { data: Record<string, unknown> }) {
  const profiles = (data.profiles as Array<{ name?: string; type?: string; summary?: string }>) ?? [];

  if (profiles.length === 0) return <Card><CardHeader><CardTitle>Zielgruppenprofile</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Noch keine Daten</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zielgruppenprofile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{p.name ?? "Profil"}</CardTitle>
                {p.type && <Badge variant="secondary">{p.type}</Badge>}
              </CardHeader>
              <CardContent className="text-sm">
                <p>{p.summary ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultsDashboard({
  artifacts,
  isLocked,
  showStrategyProfile = true,
  projectId,
  externalInsightMeta,
}: ResultsDashboardProps) {
  const strategyProfile = getArtifact(artifacts, "strategy_profile");
  const pestel = getArtifact(artifacts, "pestel");
  const pestelGeneratedAt =
    (pestel && typeof pestel === "object" && "generatedAt" in pestel && typeof (pestel as { generatedAt?: string }).generatedAt === "string")
      ? (pestel as { generatedAt: string }).generatedAt
      : externalInsightMeta?.generatedAt ?? null;
  const porter = getArtifact(artifacts, "porter_5_forces");
  const swot = getArtifact(artifacts, "swot");
  const groupMap = getArtifact(artifacts, "strategic_group_map");
  const segmentation = getArtifact(artifacts, "market_segmentation");
  const targetProfiles = getArtifact(artifacts, "target_profiles");

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-6 p-6">
        {isLocked && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
              Phase 1 ist gesperrt
            </Badge>
          </div>
        )}
        {showStrategyProfile && strategyProfile && (
          <StrategyProfileCard data={strategyProfile} stepTitle="Strategieprofil" />
        )}
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {pestel && (
            <Card className="flex flex-col gap-0 py-1">
              <CardHeader className="pb-0.5 pt-3 px-4 gap-0">
                <CardTitle className="text-2xl">Umfeld-Insights</CardTitle>
                <CardDescription className="text-xs mt-0.5 leading-tight">
                  Externe Faktoren und Trends (PESTEL), die dein Unternehmen beeinflussen.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-stretch min-h-0 overflow-auto pt-0 pb-0.5 px-4">
                <ExternalDriversSection
                  data={pestel as Record<string, unknown>}
                  companyName={(strategyProfile as Record<string, unknown>)?.company_name as string | undefined}
                  projectId={projectId}
                  generatedAt={pestelGeneratedAt}
                  refreshDisabled={!externalInsightMeta?.canRefresh}
                  refreshDisabledReason={
                    externalInsightMeta?.nextRefreshInHours != null
                      ? `Nächste Aktualisierung in ${externalInsightMeta.nextRefreshInHours}h`
                      : undefined
                  }
                  searchConfigured={externalInsightMeta?.searchConfigured ?? true}
                  showForceRefresh={externalInsightMeta?.showForceRefresh ?? false}
                  lastSearchError={externalInsightMeta?.lastSearchError ?? null}
                  lastJob={externalInsightMeta?.lastJob ?? null}
                  showLowConfidence={externalInsightMeta?.showForceRefresh ?? false}
                />
              </CardContent>
            </Card>
          )}
          {porter && (
            <Card className="flex flex-col gap-0 py-1">
              <CardHeader className="pb-0.5 pt-3 px-4 gap-0">
                <CardTitle className="text-2xl">Markt- & Wettbewerbsanalyse (Porter-Modell)</CardTitle>
                <CardDescription className="text-xs mt-0.5 leading-tight">
                  Wettbewerbskräfte und Marktstruktur nach Michael Porter.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-stretch min-h-0 overflow-visible pt-4 pb-5 px-4">
                <PorterFiveForcesSection data={porter} />
              </CardContent>
            </Card>
          )}
        </div>
        {swot && <SwotGrid data={swot} />}
        {groupMap && <GroupMapScatter data={groupMap} />}
        {segmentation && <SegmentationCards data={segmentation} />}
        {targetProfiles && <TargetProfileCards data={targetProfiles} />}
        {!strategyProfile && !pestel && !porter && !swot && !groupMap && !segmentation && !targetProfiles && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Noch keine Daten
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
