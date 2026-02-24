"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generatePhase4Draft } from "@/app/actions/phase4-actions";

interface GenerateDraftButtonProps {
  projectId: number;
}

export function GenerateDraftButton({ projectId }: GenerateDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        await generatePhase4Draft({ projectId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Generieren");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generiere Entwurf..." : "Entwurf generieren"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
