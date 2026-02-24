"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { VoiceInput } from "@/components/voice-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PHASE5_QUESTIONS,
  PHASE5_STEP_CONFIG,
  type Question,
} from "./phase5-questions";
import { ConfigDrivenWizard } from "@/app/wizard/_shared/ConfigDrivenWizard";
import { generatePhase5Final } from "@/app/actions/phase5-actions";

interface InputWizardProps {
  projectId: number;
  sessionId: number;
}

/** Validates a single answer for Phase 5 question types. */
function isAnswerValid(q: Question, value: string | string[] | undefined): boolean {
  const v = value;
  if (q.required) {
    if (v === undefined || v === null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
  }
  if (!q.required) {
    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (isEmpty) return true;
  }
  if (q.type === "multi_choice" && Array.isArray(v)) {
    const max = q.constraints?.max_selected ?? 99;
    return v.length <= max;
  }
  return true;
}

function QuestionField({
  q,
  value,
  onChange,
  error,
}: {
  q: Question;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  error?: string | null;
}) {
  const id = q.id;
  const hasError = !!error;

  if (q.type === "single_choice" && q.options) {
    const v = (typeof value === "string" ? value : Array.isArray(value) ? value[0] : "") || "";
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{q.question}</Label>
        <Select
          value={v || "_placeholder"}
          onValueChange={(val) => onChange(val === "_placeholder" ? "" : val)}
        >
          <SelectTrigger
            id={id}
            className={`h-9 w-full ${hasError ? "border-destructive" : ""}`}
          >
            <SelectValue placeholder="Bitte wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_placeholder">Bitte wählen</SelectItem>
            {q.options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasError && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (q.type === "multi_choice" && q.options) {
    const arr = Array.isArray(value) ? value : typeof value === "string" ? (value ? [value] : []) : [];
    const maxSelected = q.constraints?.max_selected ?? 4;
    const handleToggle = (optId: string, checked: boolean) => {
      if (checked) {
        if (arr.length < maxSelected) onChange([...arr, optId]);
      } else {
        onChange(arr.filter((x) => x !== optId));
      }
    };
    return (
      <div className="space-y-2">
        <Label>{q.question}</Label>
        <p className="text-xs text-muted-foreground">Max. {maxSelected} auswählbar</p>
        <div className="space-y-2">
          {q.options.map((o) => (
            <div key={o.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${id}-${o.id}`}
                checked={arr.includes(o.id)}
                onCheckedChange={(c) => handleToggle(o.id, !!c)}
              />
              <Label
                htmlFor={`${id}-${o.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {o.label}
              </Label>
            </div>
          ))}
        </div>
        {hasError && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const v = typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : "";
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{q.question}</Label>
      <VoiceInput
        id={id}
        value={v}
        onChange={(val) => onChange(val)}
        hasError={hasError}
      />
      {hasError && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function InputWizard({ projectId }: InputWizardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (answers: Record<string, unknown>) => {
    setError(null);
    const phase5: Record<string, unknown> = {};
    for (const q of PHASE5_QUESTIONS) {
      const v = answers[q.id];
      if (v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
        phase5[q.id] = v;
      }
    }
    for (const q of PHASE5_QUESTIONS) {
      if (
        !(q.id in phase5) ||
        phase5[q.id] === "" ||
        (Array.isArray(phase5[q.id]) && (phase5[q.id] as unknown[]).length === 0)
      ) {
        phase5[q.id] = q.type === "multi_choice" ? [] : "unknown";
      }
    }

    try {
      await generatePhase5Final({
        projectId,
        answersPhase5: { phase_5: phase5 as Record<string, unknown> },
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Generieren");
    }
  };

  return (
    <ConfigDrivenWizard<Question>
      projectId={String(projectId)}
      phaseId="phase_5"
      stepConfig={PHASE5_STEP_CONFIG}
      questions={PHASE5_QUESTIONS}
      loadAnswers={async () => ({})}
      saveAnswers={async () => {}}
      onComplete={handleComplete}
      lastStepButtonText="Final generieren"
      lastStepButtonPendingText="Generiere..."
      isAnswerValid={(q, v) => isAnswerValid(q, v as string | string[] | undefined)}
      getAnswerError={(q, v) =>
        !isAnswerValid(q, v as string | string[] | undefined)
          ? "Pflichtfeld."
          : null
      }
      error={error}
      containerClassName="mx-auto max-w-2xl space-y-6 p-6 border rounded-lg bg-card"
      renderStepContent={({ questionsToRender, setAnswer, getValue, getError }) => (
        <>
          {questionsToRender.map((q) => (
            <QuestionField
              key={q.id}
              q={q}
              value={getValue(q) as string | string[]}
              onChange={(v) => setAnswer(q.id, v)}
              error={getError(q)}
            />
          ))}
        </>
      )}
    />
  );
}
