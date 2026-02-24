"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  lockPhase3,
  regeneratePhase3PositioningBrandCore,
  simplifyPhase3CoreToMinimalViable,
} from "@/app/actions/phase3-actions";

const MAX_ITERATIONS = 3;

const ADJUST_OPTIONS = [
  { id: "competitive_strategy" as const, label: "Wettbewerbsstrategie" },
  { id: "positioning" as const, label: "Positionierung" },
  { id: "brand" as const, label: "Marke (Prism/Wheel/Voice)" },
];

interface ApprovalGateProps {
  projectId: number;
  sessionId: number;
  iterationCount: number;
}

export function ApprovalGate({
  projectId,
  sessionId,
  iterationCount,
}: ApprovalGateProps) {
  const router = useRouter();
  const [showAdjust, setShowAdjust] = useState(false);
  const [area, setArea] = useState<"competitive_strategy" | "positioning" | "brand">("positioning");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atMaxIterations = iterationCount >= MAX_ITERATIONS;

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await lockPhase3({ projectId, sessionId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Sperren");
      }
    });
  };

  const handleAdjust = () => {
    setShowAdjust(true);
  };

  const handleRegenerate = () => {
    if (notes.length < 8 || notes.length > 240) return;
    setError(null);
    startTransition(async () => {
      try {
        await regeneratePhase3PositioningBrandCore({
          projectId,
          sessionId,
          area,
          notes: notes.trim(),
        });
        router.refresh();
        setShowAdjust(false);
        setNotes("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Regenerieren");
      }
    });
  };

  const handleMinimalLock = () => {
    setError(null);
    startTransition(async () => {
      try {
        await simplifyPhase3CoreToMinimalViable({ projectId, sessionId });
        await lockPhase3({ projectId, sessionId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Minimal Lock");
      }
    });
  };

  if (showAdjust) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold">Anpassung</h3>
        <p className="text-sm text-muted-foreground">
          Was soll angepasst werden?
        </p>
        <div className="space-y-2">
          <Label htmlFor="adjust-area">Bereich</Label>
          <Select value={area} onValueChange={(val) => setArea(val as typeof area)}>
            <SelectTrigger id="adjust-area" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADJUST_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adjust-notes">Was soll anders werden? (8–240 Zeichen, Pflicht)</Label>
          <Textarea
            id="adjust-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Beschreibe, was angepasst werden soll..."
            rows={4}
            minLength={8}
            maxLength={240}
          />
          <p className="text-xs text-muted-foreground">{notes.length}/240</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Anpassungen: {iterationCount}/{MAX_ITERATIONS}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdjust(false)}>
            Abbrechen
          </Button>
          {!atMaxIterations && (
            <Button
              onClick={handleRegenerate}
              disabled={isPending || notes.length < 8 || notes.length > 240}
            >
              {isPending ? "Regeneriere..." : "Regenerieren"}
            </Button>
          )}
          {atMaxIterations && (
            <Button
              variant="secondary"
              onClick={handleMinimalLock}
              disabled={isPending}
            >
              {isPending ? "Verarbeite..." : "Minimal Lock"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6 border rounded-lg bg-card">
      <p className="text-lg">Passt diese Positionierung & Markenbasis für dich?</p>
      <p className="text-sm text-muted-foreground">
        Anpassungen: {iterationCount}/{MAX_ITERATIONS}
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleApprove} disabled={isPending}>
          {isPending ? "Sperre..." : "Ja, passt"}
        </Button>
        {!atMaxIterations && (
          <Button variant="outline" onClick={handleAdjust}>
            Nein, bitte anpassen
          </Button>
        )}
        {atMaxIterations && (
          <Button variant="outline" onClick={handleMinimalLock} disabled={isPending}>
            {isPending ? "Verarbeite..." : "Minimal Lock (nach max. Anpassungen)"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
