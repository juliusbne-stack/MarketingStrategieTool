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

function GuidelinesHero({ data }: { data: Record<string, unknown> }) {
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

function VisionCard({ data }: { data: Record<string, unknown> }) {
  const vision = data.vision as Record<string, unknown> | undefined;
  const statement = vision?.statement ?? "—";
  const meaning = vision?.meaning ?? "—";
  const guidingPrinciple = vision?.guiding_principle ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Vision-Statement</p>
          <p>{String(statement)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Bedeutung</p>
          <p>{String(meaning)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Leitprinzip</p>
          <p>{String(guidingPrinciple)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MissionCard({ data }: { data: Record<string, unknown> }) {
  const mission = data.mission as Record<string, unknown> | undefined;
  const statement = mission?.statement ?? "—";
  const focus = mission?.focus as string[] | undefined;
  const exclusion = mission?.exclusion ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mission-Statement</p>
          <p>{String(statement)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Fokus</p>
          {focus && focus.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {focus.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abgrenzung</p>
          <p>{String(exclusion)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsTimeline({ data }: { data: Record<string, unknown> }) {
  const goals = data.goals as Record<string, string[]> | undefined;
  const shortTerm = (goals?.short_term ?? []).slice(0, 5);
  const midTerm = (goals?.mid_term ?? []).slice(0, 5);
  const longTerm = (goals?.long_term ?? []).slice(0, 5);

  const columns = [
    { key: "short_term", label: "0–6 Monate", items: shortTerm },
    { key: "mid_term", label: "6–18 Monate", items: midTerm },
    { key: "long_term", label: "18–36 Monate", items: longTerm },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ziele-Roadmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="space-y-2">
              <h4 className="font-medium text-muted-foreground">{col.label}</h4>
              <ul className="list-disc list-inside space-y-1">
                {col.items.length
                  ? col.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))
                  : <li>—</li>}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultsDashboard({ artifacts, isLocked }: ResultsDashboardProps) {
  const guidelines = getArtifact(artifacts, "strategic_guidelines");

  return (
    <div className="space-y-6 p-6">
      {isLocked && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
            Phase 2 ist gesperrt
          </Badge>
        </div>
      )}
      {guidelines && (
        <>
          <GuidelinesHero data={guidelines} />
          <VisionCard data={guidelines} />
          <MissionCard data={guidelines} />
          <GoalsTimeline data={guidelines} />
        </>
      )}
      {!guidelines && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Leitplanken
          </CardContent>
        </Card>
      )}
    </div>
  );
}
