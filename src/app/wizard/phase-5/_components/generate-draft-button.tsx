"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generatePhase5Draft } from "@/app/actions/phase5-actions";

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
        await generatePhase5Draft({ projectId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Generieren");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generiere Draft..." : "Draft generieren"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
