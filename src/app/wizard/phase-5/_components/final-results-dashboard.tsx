"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Pillar = { id: string; title: string; core_messages?: string[]; cta?: string };
type EditorialItem = {
  id: string;
  channel: string;
  format: string;
  pillar_id: string;
  hook: string;
  goal: string;
};
type Briefing = {
  id: string;
  title: string;
  channel: string;
  format: string;
  objective?: string;
  target_audience_hint?: string;
  key_points?: string[];
  cta?: string;
  generate_actions?: { action_id: string; label: string }[];
};

interface ContentPlan {
  pillars?: Pillar[];
  editorial_board_4w?: {
    week_1?: EditorialItem[];
    week_2?: EditorialItem[];
    week_3?: EditorialItem[];
    week_4?: EditorialItem[];
  };
  briefings?: Briefing[];
}

interface FinalResultsDashboardProps {
  plan: ContentPlan;
  isLocked?: boolean;
}

export function FinalResultsDashboard({ plan, isLocked }: FinalResultsDashboardProps) {
  const pillars = plan.pillars ?? [];
  const board = plan.editorial_board_4w ?? {};
  const week1 = board.week_1 ?? [];
  const week2 = board.week_2 ?? [];
  const week3 = board.week_3 ?? [];
  const week4 = board.week_4 ?? [];
  const briefings = plan.briefings ?? [];

  return (
    <div className="space-y-6 p-6">
      {isLocked && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
            Phase 5 ist gesperrt
          </Badge>
        </div>
      )}

      {/* pillars_cards */}
      <Card>
        <CardHeader>
          <CardTitle>Content-Säulen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {pillars.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border bg-card p-4 space-y-2"
              >
                <p className="font-medium">{p.title}</p>
                {p.core_messages && p.core_messages.length > 0 && (
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {p.core_messages.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
                {p.cta && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">CTA: </span>
                    {p.cta}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* editorial_board_4w */}
      <Card>
        <CardHeader>
          <CardTitle>Redaktionsplan (4 Wochen)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Woche 1</p>
              {week1.map((item) => (
                <EditorialCard key={item.id} item={item} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Woche 2</p>
              {week2.map((item) => (
                <EditorialCard key={item.id} item={item} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Woche 3</p>
              {week3.map((item) => (
                <EditorialCard key={item.id} item={item} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Woche 4</p>
              {week4.map((item) => (
                <EditorialCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* briefings_list */}
      <Card>
        <CardHeader>
          <CardTitle>Briefings (mit Generate-Buttons)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {briefings.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{b.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{b.channel}</Badge>
                    <Badge variant="outline">{b.format}</Badge>
                  </div>
                </div>
                {b.objective && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Ziel: </span>
                    {b.objective}
                  </p>
                )}
                {b.target_audience_hint && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Zielgruppe: </span>
                    {b.target_audience_hint}
                  </p>
                )}
                {b.key_points && b.key_points.length > 0 && (
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {b.key_points.map((kp, i) => (
                      <li key={i}>{kp}</li>
                    ))}
                  </ul>
                )}
                {b.cta && (
                  <p className="text-sm">
                    <span className="font-medium">CTA: </span>
                    {b.cta}
                  </p>
                )}
                {b.generate_actions && b.generate_actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 items-center">
                    {b.generate_actions.map((a) => (
                      <Button
                        key={a.action_id}
                        variant="outline"
                        size="sm"
                        disabled
                        className="cursor-not-allowed opacity-70"
                      >
                        {a.label}
                      </Button>
                    ))}
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditorialCard({ item }: { item: EditorialItem }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm space-y-1">
      <div className="flex gap-1">
        <Badge variant="secondary" className="text-xs">
          {item.channel}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {item.format}
        </Badge>
      </div>
      <p className="font-medium truncate">{item.hook}</p>
      <p className="text-muted-foreground text-xs">{item.goal}</p>
    </div>
  );
}
