import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GenerateDraftButton } from "@/app/wizard/phase-4/_components/generate-draft-button";
import { DraftDashboard } from "@/app/wizard/phase-4/_components/draft-dashboard";
import { InputWizard } from "@/app/wizard/phase-4/_components/input-wizard";
import { FinalResultsDashboard } from "@/app/wizard/phase-4/_components/final-results-dashboard";
import { ApprovalGate } from "@/app/wizard/phase-4/_components/approval-gate";

function getArtifact(
  artifacts: { artifactKey: string; data: unknown }[],
  key: string
) {
  const a = artifacts.find((x) => x.artifactKey === key);
  return a ? (a.data as Record<string, unknown>) : null;
}

function getIterationCount(
  artifacts: { artifactKey: string; data: unknown }[]
): number {
  const a = artifacts.find((x) => x.artifactKey === "phase4_regenerate_count");
  if (!a) return 0;
  const data = a.data as { count?: number };
  return data?.count ?? 0;
}

export default async function Phase4WizardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum) || projectIdNum <= 0) redirect("/dashboard");

  const phase1Session = await getOrCreatePhase1Session(projectIdNum);
  const phase1Artifacts = await listLatestPhase1Artifacts(
    projectIdNum,
    phase1Session.id
  );
  const strategyProfile = getArtifact(phase1Artifacts, "strategy_profile");

  const phase2Session = await getOrCreatePhase2Session(projectIdNum);
  const phase2Artifacts = await listLatestPhase2Artifacts(
    projectIdNum,
    phase2Session.id
  );
  const strategicGuidelines = getArtifact(
    phase2Artifacts,
    "strategic_guidelines"
  );

  const phase3Session = await getOrCreatePhase3Session(projectIdNum);
  const phase3Artifacts = await listLatestPhase3Artifacts(
    projectIdNum,
    phase3Session.id
  );
  const positioningAndBrandCore = getArtifact(
    phase3Artifacts,
    "positioning_and_brand_core"
  );

  const missingPhases: {
    phase: number;
    href: string;
    label: string;
  }[] = [];
  if (!strategyProfile)
    missingPhases.push({
      phase: 1,
      href: `/wizard/${projectIdNum}/phase-1`,
      label: "Phase 1 (Situationsanalyse)",
    });
  if (!strategicGuidelines)
    missingPhases.push({
      phase: 2,
      href: `/wizard/${projectIdNum}/phase-2`,
      label: "Phase 2 (Strategieformulierung)",
    });
  if (!positioningAndBrandCore)
    missingPhases.push({
      phase: 3,
      href: `/wizard/${projectIdNum}/phase-3`,
      label: "Phase 3 (Positionierung & Marke)",
    });

  if (missingPhases.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">
              Phase 4: Operationalisierung (Marketing-Mix & Maßnahmen)
            </h1>
          </div>
        </div>
        <div className="container max-w-2xl py-16">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">
                Voraussetzungen fehlen
              </h2>
              <p className="text-muted-foreground mb-4">
                Bitte schließe zuerst folgende Phasen ab:
              </p>
              <ul className="space-y-2 mb-4">
                {missingPhases.map((p) => (
                  <li key={p.phase}>
                    <Button variant="outline" asChild>
                      <Link href={p.href}>{p.label}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link href="/dashboard">← Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const session = await getOrCreatePhase4Session(projectIdNum);
  const artifacts = await listLatestPhase4Artifacts(
    projectIdNum,
    session.id
  );
  const isLocked = session.status === "locked";

  const draftArtifact = getArtifact(artifacts, "marketing_plan_draft");
  const planArtifact = getArtifact(artifacts, "marketing_plan");
  const iterationCount = getIterationCount(artifacts);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">
              Phase 4: Operationalisierung (Marketing-Mix & Maßnahmen)
            </h1>
            {isLocked && (
              <Badge
                variant="secondary"
                className="bg-amber-500/20 text-amber-700 border-amber-500/50"
              >
                Gesperrt
              </Badge>
            )}
          </div>
        </div>
      </div>

      {!draftArtifact && (
        <div className="container max-w-2xl py-16">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">
                Entwurf generieren
              </h2>
              <p className="text-muted-foreground mb-4">
                Erzeuge einen ersten Marketing-Entwurf basierend auf deiner
                Strategie.
              </p>
              <GenerateDraftButton projectId={projectIdNum} />
            </CardContent>
          </Card>
        </div>
      )}

      {draftArtifact && !planArtifact && (
        <>
          <DraftDashboard draft={draftArtifact} />
          <div className="container max-w-2xl pb-8">
            <InputWizard projectId={projectIdNum} sessionId={session.id} />
          </div>
        </>
      )}

      {planArtifact && (
        <>
          <FinalResultsDashboard plan={planArtifact} isLocked={isLocked} />
          {!isLocked && (
            <div className="pb-8">
              <ApprovalGate
                projectId={projectIdNum}
                sessionId={session.id}
                iterationCount={iterationCount}
              />
            </div>
          )}
          {isLocked && (
            <div className="mx-auto max-w-2xl p-6">
              <Button asChild>
                <Link href={`/wizard/${projectIdNum}/phase-5`}>
                  Weiter zu Phase 5
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
