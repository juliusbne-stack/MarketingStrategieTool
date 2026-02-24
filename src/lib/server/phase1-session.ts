"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artifactsTable,
  wizardSessionsTable,
} from "@/db/schema";
import { assertProjectOwnership } from "./project-ownership";

const PHASE_1 = "phase_1";
const STATUS_IN_PROGRESS = "in_progress";

/**
 * Gets or creates a wizard session for the project and phase_1.
 * Returns the latest session (in_progress or locked); creates in_progress if none exists.
 * One session per project per phase (unique projectId, phaseId).
 * @param userIdOverride Dev only: bypass auth when provided
 */
export async function getOrCreatePhase1Session(
  projectId: number,
  userIdOverride?: string
) {
  const userId = userIdOverride ?? (await assertProjectOwnership(projectId)).userId;

  const existing = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.projectId, projectId),
        eq(wizardSessionsTable.phaseId, PHASE_1)
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
      phaseId: PHASE_1,
      status: STATUS_IN_PROGRESS,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create wizard session");
  }

  return created;
}

/**
 * Lists the latest artifact per artifactKey for the given session.
 * Verifies session belongs to project and user.
 * @param userIdOverride Dev only: bypass auth when provided
 */
export async function listLatestPhase1Artifacts(
  projectId: number,
  sessionId: number,
  userIdOverride?: string
) {
  const userId = userIdOverride ?? (await auth()).userId ?? null;
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
        eq(artifactsTable.phaseId, PHASE_1)
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
 * Gets the latest artifact version for a given session and artifactKey.
 */
export async function getLatestArtifactVersion(
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
        eq(artifactsTable.phaseId, PHASE_1),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    )
    .orderBy(desc(artifactsTable.version))
    .limit(1);

  return artifacts[0] ?? null;
}
