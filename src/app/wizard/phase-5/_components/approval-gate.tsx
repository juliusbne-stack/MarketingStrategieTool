"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  lockPhase5,
  regeneratePhase5Final,
  simplifyPhase5Plan,
  forceMinimalPhase5Plan,
} from "@/app/actions/phase5-actions";

const MAX_ITERATIONS = 3;

const ADJUST_OPTIONS = [
  { id: "channels" as const, label: "Kanäle" },
  { id: "frequency" as const, label: "Frequenz" },
  { id: "formats" as const, label: "Formate" },
  { id: "pillars" as const, label: "Content-Säulen" },
  { id: "editorial" as const, label: "Redaktionsplan" },
  { id: "briefings" as const, label: "Briefings" },
  { id: "other" as const, label: "Etwas anderes" },
];

type AreaKey = (typeof ADJUST_OPTIONS)[number]["id"];

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
  const [area, setArea] = useState<AreaKey[]>([]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atMaxIterations = iterationCount >= MAX_ITERATIONS;

  const handleToggleArea = (id: AreaKey, checked: boolean) => {
    if (checked) {
      if (area.length < 2) setArea((prev) => [...prev, id]);
    } else {
      setArea((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await lockPhase5({ projectId, sessionId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Sperren");
      }
    });
  };

  const handleAdjust = () => {
    setShowAdjust(true);
    setArea([]);
    setNotes("");
  };

  const handleRegenerate = () => {
    if (area.length < 1 || area.length > 2 || notes.length < 8 || notes.length > 240) return;
    setError(null);
    startTransition(async () => {
      try {
        await regeneratePhase5Final({
          projectId,
          sessionId,
          area,
          notes: notes.trim(),
        });
        router.refresh();
        setShowAdjust(false);
        setNotes("");
        setArea([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Regenerieren");
      }
    });
  };

  const handleSimplify = () => {
    setError(null);
    startTransition(async () => {
      try {
        await simplifyPhase5Plan({ projectId, sessionId });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Vereinfachen");
      }
    });
  };

  const handleMinimalLock = () => {
    setError(null);
    startTransition(async () => {
      try {
        await forceMinimalPhase5Plan({ projectId, sessionId });
        await lockPhase5({ projectId, sessionId });
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
          Was soll angepasst werden? (Max. 2 Bereiche)
        </p>
        <div className="space-y-2">
          <Label>Bereich</Label>
          <div className="space-y-2">
            {ADJUST_OPTIONS.map((o) => (
              <div key={o.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`adjust-${o.id}`}
                  checked={area.includes(o.id)}
                  onCheckedChange={(c) => handleToggleArea(o.id, !!c)}
                  disabled={!area.includes(o.id) && area.length >= 2}
                />
                <Label
                  htmlFor={`adjust-${o.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {o.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adjust-notes">Was soll ich ändern? (8–240 Zeichen, Pflicht)</Label>
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
              disabled={
                isPending ||
                area.length < 1 ||
                area.length > 2 ||
                notes.length < 8 ||
                notes.length > 240
              }
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
      <p className="text-lg">Fühlt sich dieser Content- & Maßnahmenansatz für dich realistisch umsetzbar an?</p>
      <p className="text-sm text-muted-foreground">
        Anpassungen: {iterationCount}/{MAX_ITERATIONS}
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleApprove} disabled={isPending}>
          {isPending ? "Sperre..." : "Ja, passt"}
        </Button>
        {!atMaxIterations && (
          <Button variant="outline" onClick={handleAdjust}>
            Mit Anpassungen
          </Button>
        )}
        <Button variant="outline" onClick={handleSimplify} disabled={isPending}>
          {isPending ? "Vereinfache..." : "Nein, bitte vereinfachen"}
        </Button>
        {atMaxIterations && (
          <Button variant="outline" onClick={handleMinimalLock} disabled={isPending}>
            {isPending ? "Verarbeite..." : "Minimal Lock"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
