"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteStrategyProject } from "@/app/actions/strategy-project-actions";
interface Project {
  id: number;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectListProps {
  projects: Project[];
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteStrategyProject({ projectId: deleteId });
        setDeleteId(null);
        router.refresh();
      } catch (e) {
        console.error("Delete failed:", e);
      }
    });
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <h3 className="text-lg font-semibold text-foreground">
          Noch keine Projekte
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Erstelle ein neues Projekt, um mit dem Strategie-Wizard zu starten.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{project.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDate(project.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild size="sm">
                <a href={`/wizard/${project.id}/phase-1`}>Öffnen</a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteId(project.id)}
              >
                Löschen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Wizard-Daten (Sessions, Artifacts, PDF-Exporte) dieses
              Projekts werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
