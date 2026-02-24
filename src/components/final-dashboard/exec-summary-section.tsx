"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StrategyProfileCard } from "@/components/strategy-profile/strategy-profile-card";

type ArtifactData = Record<string, unknown>;

function GuidelinesHero({ data }: { data: ArtifactData }) {
  const vision = data.vision as Record<string, unknown> | undefined;
  const statement = vision?.statement ?? "—";
  const guidingPrinciple = vision?.guiding_principle ?? "—";
  const variantId = data.selected_variant_id ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategische Leitplanken</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{String(statement)}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Variante: {String(variantId)}</Badge>
        </div>
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium text-muted-foreground">Leitprinzip</p>
          <p>{String(guidingPrinciple)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PositioningHero({ data }: { data: ArtifactData }) {
  const positioning = data.positioning as Record<string, unknown> | undefined;
  const statement = positioning?.statement ?? "—";
  const strategyType = (data.competitive_strategy as Record<string, unknown> | undefined)?.type ?? "—";
  const marketRole = positioning?.market_role ?? "—";
  const differentiation = positioning?.differentiation ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positionierung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{String(statement)}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Wettbewerbsstrategie: {String(strategyType)}</Badge>
          <Badge variant="secondary">Marktrolle: {String(marketRole)}</Badge>
        </div>
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium text-muted-foreground">Abgrenzung</p>
          <p>{String(differentiation)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export interface ExecSummarySectionProps {
  strategyProfile: ArtifactData | null;
  strategicGuidelines: ArtifactData | null;
  positioningAndBrandCore: ArtifactData | null;
}

export function ExecSummarySection({
  strategyProfile,
  strategicGuidelines,
  positioningAndBrandCore,
}: ExecSummarySectionProps) {
  const hasAny = strategyProfile || strategicGuidelines || positioningAndBrandCore;

  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Keine Daten für die Strategie in 60 Sekunden. Bitte Phase 1–3 abschließen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Strategie in 60 Sekunden</h2>
      <div className="space-y-6">
        {strategyProfile && (
          <StrategyProfileCard data={strategyProfile} stepTitle="Strategieprofil" />
        )}
        {strategicGuidelines && <GuidelinesHero data={strategicGuidelines} />}
        {positioningAndBrandCore && <PositioningHero data={positioningAndBrandCore} />}
      </div>
    </div>
  );
}
