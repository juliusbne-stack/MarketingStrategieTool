"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStrategyProject } from "@/app/actions/strategy-project-actions";

export function CreateProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 80) {
      setError("Titel muss 1–80 Zeichen haben");
      return;
    }
    startTransition(async () => {
      try {
        const project = await createStrategyProject({ title: trimmed });
        setOpen(false);
        setTitle("");
        router.push(`/wizard/${project.id}/phase-1`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Erstellen");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Neues Projekt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Strategie-Projekt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project-title">Titel</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Q1 Marketing-Strategie"
              maxLength={80}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/80 Zeichen
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Erstelle..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
