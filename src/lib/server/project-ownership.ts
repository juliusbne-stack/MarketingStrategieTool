"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { strategyProjectsTable } from "@/db/schema";

/**
 * Asserts that the project exists and belongs to the authenticated user.
 * Returns the project. Throws if unauthorized or not found.
 */
export async function assertProjectOwnership(projectId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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

  return { userId, project };
}
