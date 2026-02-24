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
type MixCardItem = { dimension: string; label: string; focus_reason: string; quick_win: string };
type ChannelItem = {
  channel_id: string;
  label: string;
  weight: number;
  role: string;
  why?: string;
};
type MeasureItem = {
  id: string;
  name: string;
  goal: string;
  effort: string;
  impact: string;
  owner?: string;
};
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
  self: "Ich selbst",
  mixed: "Teilweise ausgelagert",
  external: "Extern",
  unclear: "Unklar",
};

interface FinalResultsDashboardProps {
  plan: {
    mix_radar?: MixRadarItem[];
    mix_cards?: MixCardItem[];
    channels?: { stack?: ChannelItem[]; notes?: string };
    measures?: {
      kanban?: { now?: MeasureItem[]; next?: MeasureItem[]; later?: MeasureItem[] };
      rules_of_engagement?: string[];
    };
    constraints?: Constraints;
  };
  isLocked?: boolean;
}

export function FinalResultsDashboard({ plan, isLocked }: FinalResultsDashboardProps) {
  const mixRadar = plan.mix_radar ?? [];
  const mixCards = plan.mix_cards ?? [];
  const channels = plan.channels?.stack ?? [];
  const channelNotes = plan.channels?.notes;
  const kanban = plan.measures?.kanban ?? { now: [], next: [], later: [] };
  const rulesOfEngagement = plan.measures?.rules_of_engagement ?? [];
  const constraints = plan.constraints ?? {};

  const radarData = mixRadar.map((r) => ({
    label: r.label,
    score: r.score,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6 p-6">
      {isLocked && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
            Phase 4 ist gesperrt
          </Badge>
        </div>
      )}

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

      {mixCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mix-Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {mixCards.map((c, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">{c.label}</p>
                  <div>
                    <p className="text-sm text-muted-foreground">Warum Fokus</p>
                    <p className="text-sm">{c.focus_reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quick Win</p>
                    <p className="text-sm">{c.quick_win}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kanäle (gewichteter Stack)</CardTitle>
          {channelNotes && (
            <p className="text-sm text-muted-foreground">{channelNotes}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {channels.map((c) => (
              <div
                key={c.channel_id}
                className="flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c.role}</Badge>
                    <span className="text-sm text-muted-foreground">{c.weight}%</span>
                  </div>
                </div>
                {c.why && (
                  <p className="text-sm text-muted-foreground">{c.why}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maßnahmenplan</CardTitle>
          {rulesOfEngagement.length > 0 && (
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {rulesOfEngagement.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Now</p>
              {(kanban.now ?? []).map((m) => (
                <MeasureCard key={m.id} m={m} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Next</p>
              {(kanban.next ?? []).map((m) => (
                <MeasureCard key={m.id} m={m} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Later</p>
              {(kanban.later ?? []).map((m) => (
                <MeasureCard key={m.id} m={m} />
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
          <div className="flex flex-wrap gap-6">
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

function MeasureCard({ m }: { m: MeasureItem }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">{m.name}</p>
      <p className="text-muted-foreground">{m.goal}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-xs">
          {m.effort}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {m.impact}
        </Badge>
        {m.owner && (
          <Badge variant="secondary" className="text-xs">
            {BAND_LABELS[m.owner] ?? m.owner}
          </Badge>
        )}
      </div>
    </div>
  );
}
