"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const VIEW_OPTIONS = [
  { id: "summary", label: "Summary" },
  { id: "full", label: "Full" },
] as const;

const PHASE_OPTIONS = [
  { id: "all", label: "Alle Phasen" },
  { id: "phase_1", label: "Phase 1" },
  { id: "phase_2", label: "Phase 2" },
  { id: "phase_3", label: "Phase 3" },
  { id: "phase_4", label: "Phase 4" },
  { id: "phase_5", label: "Phase 5" },
] as const;

export function DashboardFilters() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "summary";
  const phase = searchParams.get("phase") ?? "all";

  const buildHref = (newView: string, newPhase: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    params.set("phase", newPhase);
    return `/dashboard/final?${params.toString()}`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Ansicht</p>
            <div className="flex gap-2">
              {VIEW_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={view === opt.id ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={buildHref(opt.id, phase)}>{opt.label}</Link>
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Phasen</p>
            <div className="flex flex-wrap gap-2">
              {PHASE_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={phase === opt.id ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={buildHref(view, opt.id)}>{opt.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
