"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  lockPhase2,
  regeneratePhase2Guidelines,
  simplifyPhase2GuidelinesToMinimalViable,
} from "@/app/actions/phase2-actions";

const MAX_ITERATIONS = 3;

const ADJUST_OPTIONS = [
  { id: "vision", label: "Vision" },
  { id: "mission", label: "Mission" },
  { id: "goals", label: "Ziele" },
] as const;

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
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atMaxIterations = iterationCount >= MAX_ITERATIONS;

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await lockPhase2({ projectId, sessionId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Sperren");
      }
    });
  };

  const handleAdjust = () => {
    setShowAdjust(true);
  };

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleRegenerate = () => {
    if (notes.length < 8 || notes.length > 240) return;
    setError(null);
    startTransition(async () => {
      try {
        await regeneratePhase2Guidelines({
          projectId,
          sessionId,
          notes: notes.trim(),
          selectedAreas: selectedAreas.length > 0 ? selectedAreas : undefined,
        });
        router.refresh();
        setShowAdjust(false);
        setSelectedAreas([]);
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
        await simplifyPhase2GuidelinesToMinimalViable({ projectId, sessionId });
        await lockPhase2({ projectId, sessionId });
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
          Was soll angepasst werden? (optional, max. 2 Bereiche)
        </p>
        <div className="space-y-2">
          {ADJUST_OPTIONS.map((o) => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedAreas.includes(o.id)}
                onCheckedChange={() => toggleArea(o.id)}
                disabled={!selectedAreas.includes(o.id) && selectedAreas.length >= 2}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdjust(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isPending || notes.length < 8 || notes.length > 240 || atMaxIterations}
          >
            {isPending ? "Regeneriere..." : "Regenerieren"}
          </Button>
        </div>
        {atMaxIterations && (
          <div className="space-y-2">
            <p className="text-sm text-amber-600">
              Maximale Anpassungen erreicht ({MAX_ITERATIONS}).
            </p>
            <Button
              variant="secondary"
              onClick={handleMinimalLock}
              disabled={isPending}
            >
              {isPending ? "Verarbeite..." : "Minimal Lock"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6 border rounded-lg bg-card">
      <p className="text-lg">Passt diese Vision, Mission und Ziel-Roadmap für dich?</p>
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
