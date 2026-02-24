import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listMyStrategyProjects } from "@/app/actions/strategy-project-actions";
import { ProjectList } from "./project-list";
import { CreateProjectForm } from "./create-project-form";

export default async function DashboardPage() {
  const { userId, has } = await auth();

  if (!userId) {
    redirect("/");
  }

  const projects = await listMyStrategyProjects();
  const hasProPlan = has({ plan: "pro_plan" });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            {hasProPlan && (
              <Badge
                variant="secondary"
                className="bg-amber-500/20 text-amber-700 border-amber-500/50"
              >
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            Verwalte deine Strategie-Projekte. Starte den Wizard für ein neues
            Projekt oder öffne ein bestehendes.
          </p>
        </div>

        <div className="space-y-6">
          <CreateProjectForm />
          <ProjectList projects={projects} />
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">
            <Link href="/pricing" className="text-primary hover:underline">
              View pricing
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
