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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InputWizard } from "@/app/wizard/phase-3/_components/input-wizard";
import { VariantSelector } from "@/app/wizard/phase-3/_components/variant-selector";
import { ResultsDashboard } from "@/app/wizard/phase-3/_components/results-dashboard";
import { ApprovalGate } from "@/app/wizard/phase-3/_components/approval-gate";
import type { Phase3Variant } from "@/app/wizard/phase-3/_components/variant-selector";

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
  const a = artifacts.find((x) => x.artifactKey === "phase3_regenerate_count");
  if (!a) return 0;
  const data = a.data as { count?: number };
  return data?.count ?? 0;
}

export default async function Phase3WizardPage({
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

  if (!strategyProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">
              Phase 3: Strategieumsetzung (Positionierung & Marke)
            </h1>
          </div>
        </div>
        <div className="container max-w-2xl py-16">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Phase 1 erforderlich</h2>
              <p className="text-muted-foreground mb-4">
                Bitte schließe zuerst Phase 1 (Situationsanalyse) ab.
              </p>
              <Button asChild>
                <Link href={`/wizard/${projectIdNum}/phase-1`}>
                  Zu Phase 1
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const phase2Session = await getOrCreatePhase2Session(projectIdNum);
  const phase2Artifacts = await listLatestPhase2Artifacts(
    projectIdNum,
    phase2Session.id
  );
  const strategicGuidelines = getArtifact(
    phase2Artifacts,
    "strategic_guidelines"
  );

  if (!strategicGuidelines) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">
              Phase 3: Strategieumsetzung (Positionierung & Marke)
            </h1>
          </div>
        </div>
        <div className="container max-w-2xl py-16">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Phase 2 erforderlich</h2>
              <p className="text-muted-foreground mb-4">
                Bitte schließe zuerst Phase 2 (Strategieformulierung) ab.
              </p>
              <Button asChild>
                <Link href={`/wizard/${projectIdNum}/phase-2`}>
                  Zu Phase 2
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const session = await getOrCreatePhase3Session(projectIdNum);
  const artifacts = await listLatestPhase3Artifacts(
    projectIdNum,
    session.id
  );
  const isLocked = session.status === "locked";

  const variantsArtifact = getArtifact(
    artifacts,
    "positioning_brand_variants"
  );
  const coreArtifact = getArtifact(
    artifacts,
    "positioning_and_brand_core"
  );
  const iterationCount = getIterationCount(artifacts);

  const variants = (variantsArtifact?.variants ?? []) as Phase3Variant[];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">
              Phase 3: Strategieumsetzung (Positionierung & Marke)
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

      {!variantsArtifact && !coreArtifact && (
        <InputWizard projectId={projectIdNum} />
      )}

      {variantsArtifact &&
        !coreArtifact &&
        variants &&
        variants.length >= 2 && (
          <VariantSelector
            projectId={projectIdNum}
            sessionId={session.id}
            variants={variants}
            defaultSelected="option_a"
          />
        )}

      {coreArtifact && (
        <>
          <ResultsDashboard artifacts={artifacts} isLocked={isLocked} />
          {!isLocked && (
            <ApprovalGate
              projectId={projectIdNum}
              sessionId={session.id}
              iterationCount={iterationCount}
            />
          )}
          {isLocked && (
            <div className="mx-auto max-w-2xl p-6">
              <Button asChild>
                <Link href={`/wizard/${projectIdNum}/phase-4`}>
                  Weiter zu Phase 4
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
