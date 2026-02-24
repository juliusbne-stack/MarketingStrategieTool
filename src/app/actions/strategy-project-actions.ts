"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artifactsTable,
  pdfExportJobsTable,
  strategyProjectsTable,
  wizardSessionsTable,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1, "Titel erforderlich").max(80).trim(),
});
type CreateProjectInput = z.infer<typeof createProjectSchema>;

const deleteProjectSchema = z.object({
  projectId: z.number().int().positive(),
});
type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;

/**
 * Create a new strategy project.
 */
export async function createStrategyProject(input: CreateProjectInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createProjectSchema.parse(input);

  const [project] = await db
    .insert(strategyProjectsTable)
    .values({
      userId,
      title: validated.title,
    })
    .returning();

  if (!project) throw new Error("Failed to create project");

  revalidatePath("/dashboard");
  return project;
}

/**
 * List all strategy projects for the authenticated user.
 */
export async function listMyStrategyProjects() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projects = await db
    .select()
    .from(strategyProjectsTable)
    .where(eq(strategyProjectsTable.userId, userId))
    .orderBy(desc(strategyProjectsTable.createdAt));

  return projects;
}

/**
 * Delete a strategy project and ALL associated data (artifacts, sessions, pdf jobs).
 * Uses explicit transaction-style deletes for clarity.
 */
export async function deleteStrategyProject(input: DeleteProjectInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = deleteProjectSchema.parse(input);

  const [project] = await db
    .select()
    .from(strategyProjectsTable)
    .where(
      and(
        eq(strategyProjectsTable.id, validated.projectId),
        eq(strategyProjectsTable.userId, userId)
      )
    )
    .limit(1);

  if (!project) {
    throw new Error("Projekt nicht gefunden oder keine Berechtigung");
  }

  const tableCheck = await db.execute(
    sql`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pdf_export_jobs'`
  );
  const pdfTableExists = ((tableCheck as { rows?: unknown[] }).rows ?? []).length > 0;

  await db.transaction(async (tx) => {
    await tx.delete(artifactsTable).where(eq(artifactsTable.projectId, validated.projectId));
    await tx.delete(wizardSessionsTable).where(eq(wizardSessionsTable.projectId, validated.projectId));
    if (pdfTableExists) {
      await tx.delete(pdfExportJobsTable).where(eq(pdfExportJobsTable.projectId, validated.projectId));
    }
    await tx.delete(strategyProjectsTable).where(eq(strategyProjectsTable.id, validated.projectId));
  });

  revalidatePath("/dashboard");
  return { success: true as const };
}
