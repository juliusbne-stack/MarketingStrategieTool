"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artifactsTable,
  wizardSessionsTable,
} from "@/db/schema";
import { assertProjectOwnership } from "./project-ownership";

const PHASE_3 = "phase_3";
const STATUS_IN_PROGRESS = "in_progress";

/**
 * Gets or creates a wizard session for the project and phase_3.
 */
export async function getOrCreatePhase3Session(projectId: number) {
  const { userId } = await assertProjectOwnership(projectId);

  const existing = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.projectId, projectId),
        eq(wizardSessionsTable.phaseId, PHASE_3)
      )
    )
    .orderBy(desc(wizardSessionsTable.createdAt))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(wizardSessionsTable)
    .values({
      projectId,
      userId,
      phaseId: PHASE_3,
      status: STATUS_IN_PROGRESS,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create wizard session");
  }

  return created;
}

/**
 * Lists the latest artifact per artifactKey for the given Phase 3 session.
 */
export async function listLatestPhase3Artifacts(
  projectId: number,
  sessionId: number
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const session = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.id, sessionId),
        eq(wizardSessionsTable.projectId, projectId),
        eq(wizardSessionsTable.userId, userId)
      )
    )
    .limit(1);

  if (session.length === 0) {
    throw new Error("Session not found or unauthorized");
  }

  const allArtifacts = await db
    .select()
    .from(artifactsTable)
    .where(
      and(
        eq(artifactsTable.sessionId, sessionId),
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.userId, userId),
        eq(artifactsTable.phaseId, PHASE_3)
      )
    )
    .orderBy(desc(artifactsTable.version));

  const latestByKey = new Map<string, (typeof allArtifacts)[0]>();
  for (const a of allArtifacts) {
    if (!latestByKey.has(a.artifactKey)) {
      latestByKey.set(a.artifactKey, a);
    }
  }

  return Array.from(latestByKey.values());
}

/**
 * Gets the latest artifact version for a given Phase 3 session and artifactKey.
 */
export async function getLatestPhase3Artifact(
  projectId: number,
  sessionId: number,
  artifactKey: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const session = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.id, sessionId),
        eq(wizardSessionsTable.projectId, projectId),
        eq(wizardSessionsTable.userId, userId)
      )
    )
    .limit(1);

  if (session.length === 0) {
    throw new Error("Session not found or unauthorized");
  }

  const artifacts = await db
    .select()
    .from(artifactsTable)
    .where(
      and(
        eq(artifactsTable.sessionId, sessionId),
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.userId, userId),
        eq(artifactsTable.phaseId, PHASE_3),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    )
    .orderBy(desc(artifactsTable.version))
    .limit(1);

  return artifacts[0] ?? null;
}
