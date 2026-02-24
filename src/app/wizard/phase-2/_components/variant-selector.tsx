"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { lockPhase2Variant } from "@/app/actions/phase2-actions";
import type { Phase2VariantId } from "@/lib/server/phase2-stubs";

const VARIANT_LABELS: Record<Phase2VariantId, string> = {
  conservative: "Solide & vorsichtig",
  balanced: "Ausgewogen",
  bold: "Mutig & ambitioniert",
};

export interface Variant {
  variant_id: string;
  label: string;
  vision: { statement?: string; meaning?: string; guiding_principle?: string };
  mission: { statement?: string; focus?: string[]; exclusion?: string };
  goals: { short_term?: string[]; mid_term?: string[]; long_term?: string[] };
}

interface VariantSelectorProps {
  projectId: number;
  sessionId: number;
  variants: Variant[];
  defaultSelected?: Phase2VariantId;
}

export function VariantSelector({
  projectId,
  sessionId,
  variants,
  defaultSelected = "balanced",
}: VariantSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Phase2VariantId>(
    variants.some((v) => v.variant_id === defaultSelected)
      ? (defaultSelected as Phase2VariantId)
      : (variants[0]?.variant_id as Phase2VariantId) ?? "balanced"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLock = () => {
    setError(null);
    startTransition(async () => {
      try {
        await lockPhase2Variant({ projectId, sessionId, variantId: selected });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Übernehmen");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h2 className="text-2xl font-semibold">Wähle deine Strategie-Variante</h2>
      <p className="text-muted-foreground">
        Wähle eine der drei Varianten und übernimm sie für deine Strategie.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {variants.map((v) => (
          <Card
            key={v.variant_id}
            className={`cursor-pointer transition-colors ${
              selected === v.variant_id
                ? "ring-2 ring-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setSelected(v.variant_id as Phase2VariantId)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {v.label || VARIANT_LABELS[v.variant_id as Phase2VariantId]}
                </CardTitle>
                {selected === v.variant_id && (
                  <Badge variant="default">Ausgewählt</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {v.vision?.statement ?? "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button onClick={handleLock} disabled={isPending}>
        {isPending ? "Übernehme..." : "Variante übernehmen"}
      </Button>
    </div>
  );
}
