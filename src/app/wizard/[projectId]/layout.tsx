import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { strategyProjectsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function WizardProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id) || id <= 0) notFound();

  const [project] = await db
    .select()
    .from(strategyProjectsTable)
    .where(
      and(
        eq(strategyProjectsTable.id, id),
        eq(strategyProjectsTable.userId, userId)
      )
    )
    .limit(1);

  if (!project) notFound();

  return <>{children}</>;
}
