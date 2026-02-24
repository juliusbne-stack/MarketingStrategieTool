/**
 * Dev only: Triggers Force Refresh for Umfeld-Insights.
 * GET /api/dev/trigger-refresh?projectId=1
 * No auth required in dev - uses first project or specified projectId.
 */
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { strategyProjectsTable } from "@/db/schema";
import { refreshExternalDrivers } from "@/app/actions/external-insight-actions";

const isDev = process.env.NODE_ENV === "development";

export async function GET(request: Request) {
  if (!isDev) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined;

  const [project] = projectId
    ? await db
        .select()
        .from(strategyProjectsTable)
        .where(eq(strategyProjectsTable.id, projectId))
        .limit(1)
    : await db
        .select()
        .from(strategyProjectsTable)
        .orderBy(desc(strategyProjectsTable.createdAt))
        .limit(1);

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  try {
    const result = await refreshExternalDrivers(
      { projectId: project.id, force: true },
      { userId: project.userId }
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { success: false, error: msg, stack },
      { status: 500 }
    );
  }
}
