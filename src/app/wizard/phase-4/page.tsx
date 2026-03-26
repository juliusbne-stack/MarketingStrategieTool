import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyStrategyProjects } from "@/app/actions/strategy-project-actions";

export const dynamic = "force-dynamic";

export default async function WizardPhase4RedirectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const projects = await listMyStrategyProjects();
  if (projects.length > 0) {
    redirect(`/wizard/${projects[0].id}/phase-4`);
  }
  redirect("/dashboard");
}
