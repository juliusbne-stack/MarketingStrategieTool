"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { lockPhase1, regeneratePhase1Artifacts } from "@/app/actions/phase1-actions";

interface ApprovalGateProps {
  projectId: number;
  sessionId: number;
  sessionStatus: string; // "in_progress" | "locked" from wizard session
}

const ADJUST_OPTIONS = [
  { id: "market", label: "Markt/Umfeld" },
  { id: "competition", label: "Wettbewerb" },
  { id: "target_group", label: "Zielgruppe" },
  { id: "positioning_space", label: "Positionierungsraum" },
  { id: "other", label: "Etwas anderes" },
] as const;

export function ApprovalGate({
  projectId,
  sessionId,
  sessionStatus,
}: ApprovalGateProps) {
  const router = useRouter();
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await lockPhase1({ projectId, sessionId });
      router.push(`/wizard/${projectId}/phase-2`);
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
    if (selectedAreas.length === 0 || notes.length < 8 || notes.length > 240) return;
    startTransition(async () => {
      await regeneratePhase1Artifacts({
        projectId,
        sessionId,
        selectedAreas,
        notes: notes.trim(),
      });
      router.refresh();
      setShowAdjust(false);
      setSelectedAreas([]);
      setNotes("");
    });
  };

  if (showAdjust) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold">Anpassung</h3>
        <p className="text-sm text-muted-foreground">
          Welcher Teil passt noch nicht? (max. 2 Bereiche)
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
          <Label htmlFor="adjust-notes">Was soll ich optimieren? (8–240 Zeichen)</Label>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdjust(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isPending || selectedAreas.length === 0 || notes.length < 8 || notes.length > 240}
          >
            {isPending ? "Regeneriere..." : "Regenerieren"}
          </Button>
        </div>
      </div>
    );
  }

  if (sessionStatus === "locked") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 border rounded-lg bg-card">
        <p className="text-lg">Phase 1 ist abgeschlossen.</p>
        <Button onClick={() => router.push(`/wizard/${projectId}/phase-2`)}>
          Weiter zu Phase 2
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6 border rounded-lg bg-card">
      <p className="text-lg">Bist du mit den Ergebnissen der Situationsanalyse zufrieden?</p>
      <div className="flex gap-4">
        <Button onClick={handleApprove} disabled={isPending}>
          {isPending ? "Sperre..." : "Ja, passt"}
        </Button>
        <Button variant="outline" onClick={handleAdjust}>
          Nein, ich möchte etwas ändern
        </Button>
      </div>
    </div>
  );
}
