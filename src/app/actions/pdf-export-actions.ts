"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pdfExportJobsTable, strategyProjectsTable } from "@/db/schema";
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
import { renderToBuffer } from "@react-pdf/renderer";
import { StrategyPdfDocument } from "@/lib/pdf/strategy-pdf-document";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";

const exportStrategyPdfSchema = z.object({
  projectId: z.number().int().positive(),
});
type ExportStrategyPdfInput = z.infer<typeof exportStrategyPdfSchema>;

function getArtifact(
  artifacts: { artifactKey: string; data: unknown }[],
  key: string
): Record<string, unknown> | null {
  const a = artifacts.find((x) => x.artifactKey === key);
  return a ? (a.data as Record<string, unknown>) : null;
}

/**
 * Export strategy as PDF. Synchronous v1.
 * Spec: cursor-plans/legacy/pdf_export.spec.json
 */
export async function exportStrategyPdf(input: ExportStrategyPdfInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { projectId } = exportStrategyPdfSchema.parse(input);

  const [project] = await db
    .select()
    .from(strategyProjectsTable)
    .where(
      and(
        eq(strategyProjectsTable.id, projectId),
        eq(strategyProjectsTable.userId, userId)
      )
    )
    .limit(1);

  if (!project) {
    throw new Error("Projekt nicht gefunden oder keine Berechtigung");
  }

  const projectTitle = project.title;
  const createdAt = new Date();
  const exportDate = createdAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [phase1Session, phase2Session, phase3Session, phase4Session, phase5Session] =
    await Promise.all([
      getOrCreatePhase1Session(projectId),
      getOrCreatePhase2Session(projectId),
      getOrCreatePhase3Session(projectId),
      getOrCreatePhase4Session(projectId),
      getOrCreatePhase5Session(projectId),
    ]);

  const [
    phase1Artifacts,
    phase2Artifacts,
    phase3Artifacts,
    phase4Artifacts,
    phase5Artifacts,
  ] = await Promise.all([
    listLatestPhase1Artifacts(projectId, phase1Session.id),
    listLatestPhase2Artifacts(projectId, phase2Session.id),
    listLatestPhase3Artifacts(projectId, phase3Session.id),
    listLatestPhase4Artifacts(projectId, phase4Session.id),
    listLatestPhase5Artifacts(projectId, phase5Session.id),
  ]);

  const artifactMap: Record<string, Record<string, unknown> | null> = {};

  const phase1Keys = ["strategy_profile", "pestel", "porter_5_forces", "swot", "strategic_group_map", "market_segmentation", "target_profiles"];
  for (const key of phase1Keys) {
    artifactMap[key] = getArtifact(phase1Artifacts, key);
  }
  artifactMap["strategic_guidelines"] = getArtifact(phase2Artifacts, "strategic_guidelines");
  artifactMap["positioning_and_brand_core"] = getArtifact(phase3Artifacts, "positioning_and_brand_core");
  artifactMap["marketing_plan"] = getArtifact(phase4Artifacts, "marketing_plan");
  artifactMap["content_plan"] = getArtifact(phase5Artifacts, "content_plan");

  const [job] = await db
    .insert(pdfExportJobsTable)
    .values({
      projectId,
      userId,
      status: "completed",
      meta: { projectTitle, viewMode: "full" },
    })
    .returning();

  if (!job) {
    throw new Error("Failed to create PDF export job");
  }

  try {
    const buffer = await renderToBuffer(
      StrategyPdfDocument({
        projectTitle,
        exportDate,
        artifacts: artifactMap,
      })
    );

    const exportsDir = path.join(process.cwd(), "public", "exports");
    await mkdir(exportsDir, { recursive: true });

    const d = createdAt;
    const timestamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;
    const filename = `strategy_${projectId}_${timestamp}_${job.id}.pdf`;
    const filePath = path.join(exportsDir, filename);

    await writeFile(filePath, buffer);

    const fileUrl = `/exports/${filename}`;

    await db
      .update(pdfExportJobsTable)
      .set({ fileUrl })
      .where(and(eq(pdfExportJobsTable.id, job.id), eq(pdfExportJobsTable.userId, userId)));

    return { success: true as const, fileUrl, jobId: job.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(pdfExportJobsTable)
      .set({ status: "failed", error: errorMessage })
      .where(
        and(
          eq(pdfExportJobsTable.id, job.id),
          eq(pdfExportJobsTable.projectId, projectId),
          eq(pdfExportJobsTable.userId, userId)
        )
      );
    throw new Error(`PDF export failed: ${errorMessage}`);
  }
}
