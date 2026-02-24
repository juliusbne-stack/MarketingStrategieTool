"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { lockPhase3Variant } from "@/app/actions/phase3-actions";
import type { Phase3VariantId } from "@/lib/server/phase3-stubs";

export interface Phase3Variant {
  variant_id: string;
  label: string;
  competitive_strategy?: { type?: string; rationale?: string };
  positioning?: { statement?: string };
  brand?: { promise?: string };
}

interface VariantSelectorProps {
  projectId: number;
  sessionId: number;
  variants: Phase3Variant[];
  defaultSelected?: Phase3VariantId;
}

export function VariantSelector({
  projectId,
  sessionId,
  variants,
  defaultSelected = "option_b",
}: VariantSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Phase3VariantId>(
    variants.some((v) => v.variant_id === defaultSelected)
      ? (defaultSelected as Phase3VariantId)
      : (variants[0]?.variant_id as Phase3VariantId) ?? "option_b"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLock = () => {
    setError(null);
    startTransition(async () => {
      try {
        await lockPhase3Variant({ projectId, sessionId, variantId: selected });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Übernehmen");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h2 className="text-2xl font-semibold">Wähle deine Positionierungs-Variante</h2>
      <p className="text-muted-foreground">
        Wähle eine der zwei Varianten und übernimm sie für deine Positionierung & Marke.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {variants.map((v) => (
          <Card
            key={v.variant_id}
            className={`cursor-pointer transition-colors ${
              selected === v.variant_id
                ? "ring-2 ring-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setSelected(v.variant_id as Phase3VariantId)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {v.label || (v.variant_id === "option_a" ? "Option A" : "Option B")}
                </CardTitle>
                {selected === v.variant_id && (
                  <Badge variant="default">Ausgewählt</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {v.positioning?.statement ?? v.brand?.promise ?? "—"}
              </p>
              {v.competitive_strategy?.type && (
                <Badge variant="secondary" className="text-xs">
                  {v.competitive_strategy.type}
                </Badge>
              )}
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
