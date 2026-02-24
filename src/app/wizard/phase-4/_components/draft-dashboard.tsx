"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MixRadarItem = { dimension: string; label: string; score: number };
type ChannelItem = { channel_id: string; label: string; weight: number; role: string };
type MeasureItem = { id: string; name: string; goal: string; effort: string; impact: string };
type Constraints = {
  time_per_week_band?: string;
  complexity_level?: string;
  budget_band?: string;
};

const BAND_LABELS: Record<string, string> = {
  lt_2: "Unter 2h",
  "2_5": "2–5h",
  "5_10": "5–10h",
  gt_10: ">10h",
  simple: "Einfach",
  balanced: "Ausgewogen",
  advanced: "Komplex",
  none: "Kein",
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  unknown: "Unbekannt",
};

interface DraftDashboardProps {
  draft: {
    mix_radar?: MixRadarItem[];
    channels?: { stack?: ChannelItem[] };
    measures?: { kanban?: { now?: MeasureItem[]; next?: MeasureItem[]; later?: MeasureItem[] } };
    constraints?: Constraints;
  };
}

export function DraftDashboard({ draft }: DraftDashboardProps) {
  const mixRadar = draft.mix_radar ?? [];
  const channels = draft.channels?.stack ?? [];
  const kanban = draft.measures?.kanban ?? { now: [], next: [], later: [] };
  const constraints = draft.constraints ?? {};

  const radarData = mixRadar.map((r) => ({
    label: r.label,
    score: r.score,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">Marketing-Entwurf</h2>

      {mixRadar.length >= 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Marketing-Mix Fokus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Fokus"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kanäle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {channels.map((c) => (
              <div
                key={c.channel_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="font-medium">{c.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{c.role}</Badge>
                  <span className="text-sm text-muted-foreground">{c.weight}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maßnahmenplan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Now</p>
              {(kanban.now ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border bg-card p-3 text-sm">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground">{m.goal}</p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {m.effort}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {m.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Next</p>
              {(kanban.next ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border bg-card p-3 text-sm">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground">{m.goal}</p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {m.effort}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {m.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Later</p>
              {(kanban.later ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border bg-card p-3 text-sm">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground">{m.goal}</p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {m.effort}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {m.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rahmenbedingungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Zeit/Woche</p>
              <p className="font-medium">
                {BAND_LABELS[constraints.time_per_week_band ?? ""] ?? constraints.time_per_week_band ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="font-medium">
                {BAND_LABELS[constraints.budget_band ?? ""] ?? constraints.budget_band ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Komplexität</p>
              <p className="font-medium">
                {BAND_LABELS[constraints.complexity_level ?? ""] ?? constraints.complexity_level ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
