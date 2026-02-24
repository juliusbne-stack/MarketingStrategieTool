import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import {
  getOrCreatePhase2Session,
  listLatestPhase2Artifacts,
} from "@/lib/server/phase2-session";
import {
  getOrCreatePhase3Session,
  listLatestPhase3Artifacts,
} from "@/lib/server/phase3-session";
import {
  getOrCreatePhase4Session,
  listLatestPhase4Artifacts,
} from "@/lib/server/phase4-session";
import {
  getOrCreatePhase5Session,
  listLatestPhase5Artifacts,
} from "@/lib/server/phase5-session";
import { listMyStrategyProjects } from "@/app/actions/strategy-project-actions";
import { getExternalInsightMeta } from "@/app/actions/external-insight-actions";
import { ResultsDashboard as Phase1ResultsDashboard } from "@/app/wizard/phase-1/_components/results-dashboard";
import { ResultsDashboard as Phase2ResultsDashboard } from "@/app/wizard/phase-2/_components/results-dashboard";
import { ResultsDashboard as Phase3ResultsDashboard } from "@/app/wizard/phase-3/_components/results-dashboard";
import { FinalResultsDashboard as Phase4FinalResultsDashboard } from "@/app/wizard/phase-4/_components/final-results-dashboard";
import { FinalResultsDashboard as Phase5FinalResultsDashboard } from "@/app/wizard/phase-5/_components/final-results-dashboard";
import { ExecSummarySection } from "@/components/final-dashboard/exec-summary-section";
import { DashboardFilters } from "@/components/final-dashboard/dashboard-filters";
import { PdfExportButton } from "@/components/final-dashboard/pdf-export-button";
import { DevRefreshButton } from "@/components/final-dashboard/dev-refresh-button";

function getArtifact(
  artifacts: { artifactKey: string; data: unknown }[],
  key: string
): Record<string, unknown> | null {
  const a = artifacts.find((x) => x.artifactKey === key);
  return a ? (a.data as Record<string, unknown>) : null;
}

function MissingPhaseHint({
  projectId,
  phaseId,
}: {
  projectId: number;
  phaseId: string;
}) {
  const phaseHref: Record<string, string> = {
    phase_1: `/wizard/${projectId}/phase-1`,
    phase_2: `/wizard/${projectId}/phase-2`,
    phase_3: `/wizard/${projectId}/phase-3`,
    phase_4: `/wizard/${projectId}/phase-4`,
    phase_5: `/wizard/${projectId}/phase-5`,
  };
  const phaseLabels: Record<string, string> = {
    phase_1: "Phase 1: Situationsanalyse",
    phase_2: "Phase 2: Strategieformulierung",
    phase_3: "Phase 3: Positionierung & Marke",
    phase_4: "Phase 4: Marketing-Mix & Maßnahmen",
    phase_5: "Phase 5: Content & Umsetzung",
  };
  const href = phaseHref[phaseId];
  const label = phaseLabels[phaseId];
  if (!href || !label) return null;
  return (
    <Card>
      <CardContent className="py-8">
        <p className="text-muted-foreground text-center mb-4">
          Phase noch nicht abgeschlossen. Bitte den Wizard durchlaufen.
        </p>
        <Button asChild>
          <Link href={href}>{label} öffnen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function FinalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; phase?: string; projectId?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const params = await searchParams;
  const viewMode = params.view === "full" ? "full" : "summary";
  const phaseFilter = params.phase ?? "all";

  let projectIdNum: number | null = null;
  if (params.projectId) {
    const parsed = parseInt(params.projectId, 10);
    if (!isNaN(parsed) && parsed > 0) projectIdNum = parsed;
  }

  const projects = await listMyStrategyProjects();

  if (!projectIdNum) {
    if (projects.length > 0) {
      redirect(`/dashboard/final?projectId=${projects[0].id}`);
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gesamt-Dashboard
          </h1>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Du hast noch keine Strategie-Projekte. Erstelle ein Projekt, um
                den Wizard zu starten.
              </p>
              <Button asChild>
                <Link href="/dashboard">Projekt anlegen</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [phase1Session, phase2Session, phase3Session, phase4Session, phase5Session] =
    await Promise.all([
      getOrCreatePhase1Session(projectIdNum),
      getOrCreatePhase2Session(projectIdNum),
      getOrCreatePhase3Session(projectIdNum),
      getOrCreatePhase4Session(projectIdNum),
      getOrCreatePhase5Session(projectIdNum),
    ]);

  const [
    phase1Artifacts,
    phase2Artifacts,
    phase3Artifacts,
    phase4Artifacts,
    phase5Artifacts,
  ] = await Promise.all([
    listLatestPhase1Artifacts(projectIdNum, phase1Session.id),
    listLatestPhase2Artifacts(projectIdNum, phase2Session.id),
    listLatestPhase3Artifacts(projectIdNum, phase3Session.id),
    listLatestPhase4Artifacts(projectIdNum, phase4Session.id),
    listLatestPhase5Artifacts(projectIdNum, phase5Session.id),
  ]);

  const strategyProfile = getArtifact(phase1Artifacts, "strategy_profile");
  const externalInsightMeta = await getExternalInsightMeta(projectIdNum);
  const strategicGuidelines = getArtifact(
    phase2Artifacts,
    "strategic_guidelines"
  );
  const positioningAndBrandCore = getArtifact(
    phase3Artifacts,
    "positioning_and_brand_core"
  );
  const marketingPlan = getArtifact(phase4Artifacts, "marketing_plan");
  const contentPlan = getArtifact(phase5Artifacts, "content_plan");

  const hasPhase1 = phase1Artifacts.length > 0;
  const hasPhase2 = !!strategicGuidelines;
  const hasPhase3 = !!positioningAndBrandCore;
  const hasPhase4 = !!marketingPlan;
  const hasPhase5 = !!contentPlan;

  const showExecSummary = true;
  const showPhase1 =
    viewMode === "full" &&
    (phaseFilter === "all" || phaseFilter === "phase_1");
  const showPhase2 =
    viewMode === "full" &&
    (phaseFilter === "all" || phaseFilter === "phase_2");
  const showPhase3 =
    viewMode === "full" &&
    (phaseFilter === "all" || phaseFilter === "phase_3");
  const showPhase4 =
    viewMode === "full" &&
    (phaseFilter === "all" || phaseFilter === "phase_4");
  const showPhase5 =
    viewMode === "full" &&
    (phaseFilter === "all" || phaseFilter === "phase_5");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Gesamt-Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Strategie in 60 Sekunden und alle Phasen im Überblick.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <DevRefreshButton
              projectId={projectIdNum}
              searchConfigured={externalInsightMeta?.searchConfigured ?? true}
            />
            <PdfExportButton projectId={projectIdNum} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-20 rounded-lg border animate-pulse bg-muted/50" />
          }
        >
          <DashboardFilters />
        </Suspense>

        <div className="space-y-10">
          {showExecSummary && (
            <section>
              <ExecSummarySection
                strategyProfile={strategyProfile}
                strategicGuidelines={strategicGuidelines}
                positioningAndBrandCore={positioningAndBrandCore}
              />
            </section>
          )}

          {showPhase1 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Phase 1 — Situationsanalyse
              </h2>
              {hasPhase1 ? (
                <Phase1ResultsDashboard
                  artifacts={phase1Artifacts}
                  isLocked={phase1Session.status === "locked"}
                  showStrategyProfile={false}
                  projectId={projectIdNum}
                  externalInsightMeta={externalInsightMeta}
                />
              ) : (
                <MissingPhaseHint projectId={projectIdNum} phaseId="phase_1" />
              )}
            </section>
          )}

          {showPhase2 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Phase 2 — Strategieformulierung
              </h2>
              {hasPhase2 ? (
                <Phase2ResultsDashboard
                  artifacts={phase2Artifacts}
                  isLocked={phase2Session.status === "locked"}
                />
              ) : (
                <MissingPhaseHint projectId={projectIdNum} phaseId="phase_2" />
              )}
            </section>
          )}

          {showPhase3 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Phase 3 — Positionierung & Marke
              </h2>
              {hasPhase3 ? (
                <Phase3ResultsDashboard
                  artifacts={phase3Artifacts}
                  isLocked={phase3Session.status === "locked"}
                />
              ) : (
                <MissingPhaseHint projectId={projectIdNum} phaseId="phase_3" />
              )}
            </section>
          )}

          {showPhase4 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Phase 4 — Marketing-Mix & Maßnahmen
              </h2>
              {hasPhase4 ? (
                <Phase4FinalResultsDashboard
                  plan={
                    marketingPlan as Parameters<
                      typeof Phase4FinalResultsDashboard
                    >[0]["plan"]
                  }
                  isLocked={phase4Session.status === "locked"}
                />
              ) : (
                <MissingPhaseHint projectId={projectIdNum} phaseId="phase_4" />
              )}
            </section>
          )}

          {showPhase5 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Phase 5 — Content & Umsetzung
              </h2>
              {hasPhase5 ? (
                <Phase5FinalResultsDashboard
                  plan={
                    contentPlan as Parameters<
                      typeof Phase5FinalResultsDashboard
                    >[0]["plan"]
                  }
                  isLocked={phase5Session.status === "locked"}
                />
              ) : (
                <MissingPhaseHint projectId={projectIdNum} phaseId="phase_5" />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
