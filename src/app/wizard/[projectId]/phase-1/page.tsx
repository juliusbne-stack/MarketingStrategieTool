import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import { getExternalInsightMeta } from "@/app/actions/external-insight-actions";
import { InputWizard } from "@/app/wizard/phase-1/_components/input-wizard";
import { ResultsDashboard } from "@/app/wizard/phase-1/_components/results-dashboard";
import { ApprovalGate } from "@/app/wizard/phase-1/_components/approval-gate";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DevRefreshButton } from "@/components/final-dashboard/dev-refresh-button";

export default async function Phase1WizardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum) || projectIdNum <= 0) redirect("/dashboard");

  const session = await getOrCreatePhase1Session(projectIdNum);
  const [artifacts, externalInsightMeta] = await Promise.all([
    listLatestPhase1Artifacts(projectIdNum, session.id),
    getExternalInsightMeta(projectIdNum),
  ]);
  const isLocked = session.status === "locked";
  const hasArtifacts = artifacts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-lg font-semibold">Phase 1: Situationsanalyse</h1>
            {hasArtifacts && (
              <DevRefreshButton
                projectId={projectIdNum}
                searchConfigured={externalInsightMeta?.searchConfigured ?? true}
              />
            )}
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

      {!hasArtifacts && <InputWizard projectId={projectIdNum} />}

      {hasArtifacts && (
        <>
          <ResultsDashboard
            artifacts={artifacts}
            isLocked={isLocked}
            projectId={projectIdNum}
            externalInsightMeta={externalInsightMeta}
          />
          <ApprovalGate
            projectId={projectIdNum}
            sessionId={session.id}
            sessionStatus={session.status}
          />
        </>
      )}
    </div>
  );
}
