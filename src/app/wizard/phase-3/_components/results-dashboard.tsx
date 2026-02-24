"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Artifact } from "./types";

interface ResultsDashboardProps {
  artifacts: Artifact[];
  isLocked?: boolean;
}

function getArtifact(artifacts: Artifact[], key: string): Record<string, unknown> | null {
  const a = artifacts.find((x) => x.artifactKey === key);
  return a ? (a.data as Record<string, unknown>) : null;
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function PositioningHero({ data }: { data: Record<string, unknown> }) {
  const statement = getNested(data, "positioning.statement") ?? "—";
  const strategyType = getNested(data, "competitive_strategy.type") ?? "—";
  const marketRole = getNested(data, "positioning.market_role") ?? "—";
  const differentiation = getNested(data, "positioning.differentiation") ?? "—";

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

function PositioningCanvas({ data }: { data: Record<string, unknown> }) {
  const canvas = getNested(data, "positioning.canvas") as Record<string, unknown> | undefined;
  const fields = [
    { key: "target", label: "Für wen?" },
    { key: "problem", label: "Welches Problem?" },
    { key: "outcome", label: "Welches Ergebnis?" },
    { key: "approach", label: "Wie / Ansatz?" },
    { key: "proof", label: "Warum glaubwürdig?" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positioning Canvas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{f.label}</p>
              <p>{canvas ? String(canvas[f.key] ?? "—") : "—"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitiveStrategyCompare({ data }: { data: Record<string, unknown> }) {
  const strategy = data.competitive_strategy as Record<string, unknown> | undefined;
  const type = strategy?.type ?? "—";
  const rationale = strategy?.rationale ?? "—";
  const tradeoffs = (strategy?.tradeoffs ?? []) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wettbewerbsstrategie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Typ</p>
          <p>{String(type)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Begründung</p>
          <p>{String(rationale)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Trade-offs</p>
          {tradeoffs.length ? (
            <ul className="list-disc list-inside space-y-1">
              {tradeoffs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandPrismVisual({ data }: { data: Record<string, unknown> }) {
  const prism = getNested(data, "brand.prism") as Record<string, string[]> | undefined;
  const facets = [
    { key: "physique", label: "Physique" },
    { key: "personality", label: "Personality" },
    { key: "culture", label: "Culture" },
    { key: "relationship", label: "Relationship" },
    { key: "reflection", label: "Reflection" },
    { key: "self_image", label: "Self-Image" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Identity Prism</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facets.map((f) => {
            const items = (prism?.[f.key] ?? []) as string[];
            return (
              <div key={f.key} className="rounded-lg border p-3 space-y-2">
                <p className="font-medium text-muted-foreground">{f.label}</p>
                {items.length ? (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">—</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandWheelVisual({ data }: { data: Record<string, unknown> }) {
  const wheel = getNested(data, "brand.brand_wheel") as Record<string, unknown> | undefined;
  const attributes = (wheel?.attributes ?? []) as string[];
  const benefits = (wheel?.benefits ?? []) as string[];
  const values = (wheel?.values ?? []) as string[];
  const essence = wheel?.essence ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markensteuerrad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center rounded-full border-2 border-primary/30 w-24 h-24 flex items-center justify-center mx-auto">
          <p className="text-sm font-medium text-center px-2">{String(essence)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground">Attribute</p>
            <ul className="list-disc list-inside text-sm">
              {attributes.length ? attributes.slice(0, 4).map((a, i) => <li key={i}>{a}</li>) : <li>—</li>}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground">Nutzen</p>
            <ul className="list-disc list-inside text-sm">
              {benefits.length ? benefits.slice(0, 4).map((b, i) => <li key={i}>{b}</li>) : <li>—</li>}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground">Werte</p>
            <ul className="list-disc list-inside text-sm">
              {values.length ? values.slice(0, 3).map((v, i) => <li key={i}>{v}</li>) : <li>—</li>}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandVoiceCard({ data }: { data: Record<string, unknown> }) {
  const brand = data.brand as Record<string, unknown> | undefined;
  const promise = brand?.promise ?? "—";
  const values = (brand?.values ?? []) as string[];
  const voice = brand?.voice as Record<string, unknown> | undefined;
  const tone = voice?.tone ?? "—";
  const styleRules = (voice?.style_rules ?? []) as string[];
  const doList = (voice?.do ?? []) as string[];
  const dontList = (voice?.dont ?? []) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markenstimme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Markenversprechen</p>
          <p>{String(promise)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Werte</p>
          {values.length ? (
            <ul className="list-disc list-inside">{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Ton</p>
          <p>{String(tone)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Style-Regeln</p>
          {styleRules.length ? (
            <ul className="list-disc list-inside">{styleRules.map((s, i) => <li key={i}>{s}</li>)}</ul>
          ) : (
            <p>—</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Do</p>
            {doList.length ? (
              <ul className="list-disc list-inside">{doList.map((d, i) => <li key={i}>{d}</li>)}</ul>
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Don&apos;t</p>
            {dontList.length ? (
              <ul className="list-disc list-inside">{dontList.map((d, i) => <li key={i}>{d}</li>)}</ul>
            ) : (
              <p>—</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultsDashboard({ artifacts, isLocked }: ResultsDashboardProps) {
  const core = getArtifact(artifacts, "positioning_and_brand_core");

  return (
    <div className="space-y-6 p-6">
      {isLocked && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
            Phase 3 ist gesperrt
          </Badge>
        </div>
      )}
      {core && (
        <>
          <PositioningHero data={core} />
          <PositioningCanvas data={core} />
          <CompetitiveStrategyCompare data={core} />
          <BrandPrismVisual data={core} />
          <BrandWheelVisual data={core} />
          <BrandVoiceCard data={core} />
        </>
      )}
      {!core && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Positionierung & Marke
          </CardContent>
        </Card>
      )}
    </div>
  );
}
