"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  PHASE1_QUESTIONS,
  PHASE1_STEP_CONFIG,
  type Question,
} from "./phase1-questions";
import { ConfigDrivenWizard } from "@/app/wizard/_shared/ConfigDrivenWizard";
import { generatePhase1Artifacts } from "@/app/actions/phase1-actions";
import {
  type PresetOrCustomAnswer,
  isPresetOrCustom,
  PHASE1_CUSTOM_QUESTION_IDS,
} from "@/lib/validations/phase1";

type AnswerValue = string | string[] | PresetOrCustomAnswer;

/** Validates a single answer against question rules. Returns true if valid. */
function isAnswerValid(q: Question, value: AnswerValue | undefined): boolean {
  const v = value;

  if (q.allow_custom && isPresetOrCustom(v)) {
    if (v.type === "preset") {
      const val = v.value;
      if (typeof val === "string") return val.trim().length > 0;
      if (!Array.isArray(val) || val.length === 0) return false;
      const max = q.constraints?.max_selected ?? 99;
      return val.length <= max;
    }
    return v.type === "custom" && v.value.trim().length >= (q.custom_min_chars ?? 5);
  }

  if (q.required) {
    if (v === undefined || v === null) return false;
    if (typeof v === "string") {
      if (v.trim() === "") return false;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return false;
    }
  }

  if (!q.required) {
    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (isEmpty) return true;
  }

  const validation = q.validation;
  const constraints = q.constraints;

  if (validation?.min_chars !== undefined || validation?.max_chars !== undefined) {
    const text =
      typeof v === "string"
        ? v
        : Array.isArray(v)
          ? v.join("")
          : "";
    const len = text.trim().length;
    if (validation.min_chars !== undefined && len < validation.min_chars) return false;
    if (validation.max_chars !== undefined && len > validation.max_chars) return false;
  }

  if (q.type === "list_text_optional" && typeof v === "string" && v.trim()) {
    const items = v.split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (validation?.min_items !== undefined && items.length < validation.min_items) return false;
    if (validation?.max_items !== undefined && items.length > validation.max_items) return false;
    if (validation?.max_chars_each !== undefined) {
      if (items.some((item) => item.length > validation!.max_chars_each!)) return false;
    }
  }

  if (q.type === "multi_choice" && Array.isArray(v)) {
    const minItems = validation?.min_items ?? (q.required ? 1 : 0);
    if (v.length < minItems) return false;
    const maxItems = validation?.max_items ?? constraints?.max_selected ?? 99;
    if (v.length > maxItems) return false;
  }

  return true;
}

/** Returns user-facing error message when invalid, null when valid. */
function getAnswerError(q: Question, value: AnswerValue | undefined): string | null {
  const v = value;

  if (q.allow_custom && isPresetOrCustom(v)) {
    if (v.type === "custom") {
      const min = q.custom_min_chars ?? 5;
      if (v.value.trim().length < min) return `Mindestens ${min} Zeichen.`;
    }
    if (v.type === "preset" && Array.isArray(v.value)) {
      if (v.value.length === 0) return "Bitte wähle mindestens einen Grund.";
      const max = q.constraints?.max_selected ?? 99;
      if (v.value.length > max) return `Maximal ${max} Auswahlen.`;
    }
    return null;
  }

  if (q.required) {
    if (v === undefined || v === null) return "Pflichtfeld.";
    if (typeof v === "string" && v.trim() === "") return "Pflichtfeld.";
    if (Array.isArray(v) && v.length === 0) return "Pflichtfeld.";
  }

  if (!q.required) {
    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (isEmpty) return null;
  }

  const validation = q.validation;
  const constraints = q.constraints;

  if (validation?.min_chars !== undefined) {
    const text =
      typeof v === "string"
        ? v
        : Array.isArray(v)
          ? v.join("")
          : "";
    if (text.trim().length < validation.min_chars) {
      return `Mindestens ${validation.min_chars} Zeichen.`;
    }
  }
  if (validation?.max_chars !== undefined) {
    const text =
      typeof v === "string"
        ? v
        : Array.isArray(v)
          ? v.join("")
          : "";
    if (text.trim().length > validation.max_chars) {
      return `Maximal ${validation.max_chars} Zeichen.`;
    }
  }

  if (q.type === "list_text_optional" && typeof v === "string" && v.trim()) {
    const items = v.split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (validation?.min_items !== undefined && items.length < validation.min_items) {
      return `Mindestens ${validation.min_items} Einträge.`;
    }
    if (validation?.max_items !== undefined && items.length > validation.max_items) {
      return `Maximal ${validation.max_items} Einträge.`;
    }
    if (validation?.max_chars_each !== undefined) {
      const tooLong = items.find((item) => item.length > validation!.max_chars_each!);
      if (tooLong) return `Jeder Eintrag max. ${validation.max_chars_each} Zeichen.`;
    }
  }

  if (q.type === "multi_choice" && Array.isArray(v)) {
    const minItems = validation?.min_items ?? (q.required ? 1 : 0);
    if (v.length < minItems) return `Mindestens ${minItems} Auswahl.`;
    const maxItems = validation?.max_items ?? constraints?.max_selected ?? 99;
    if (v.length > maxItems) return `Maximal ${maxItems} Auswahlen.`;
  }

  return null;
}

function QuestionField({
  q,
  value,
  onChange,
  onCustomDraftChange,
  customDraft,
  error,
}: {
  q: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onCustomDraftChange?: (qId: string, text: string) => void;
  customDraft?: string;
  error?: string | null;
}) {
  const id = q.id;
  const hasError = !!error;

  if (q.type === "single_choice" && q.options) {
    const isCustom = q.allow_custom && isPresetOrCustom(value) && value.type === "custom";
    const selectedId =
      q.allow_custom && isPresetOrCustom(value)
        ? value.type === "preset"
          ? (typeof value.value === "string" ? value.value : value.value[0] ?? "")
          : "custom"
        : (typeof value === "string" ? value : Array.isArray(value) ? value[0] : "") || "";
    const customText = isCustom && isPresetOrCustom(value) ? value.value : (customDraft ?? "");

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{q.question}</Label>
        {q.helper && <p className="text-sm text-muted-foreground">{q.helper}</p>}
        <Select
          value={selectedId || "_placeholder"}
          onValueChange={(val) => {
            if (val === "_placeholder") {
              onChange(q.allow_custom ? { type: "preset", value: "" } : "");
            } else if (q.allow_custom && val === "custom") {
              onChange({ type: "custom", value: customDraft ?? "" });
            } else if (q.allow_custom) {
              onChange({ type: "preset", value: val });
            } else {
              onChange(val);
            }
          }}
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
        {q.allow_custom && isCustom && (
          <VoiceInput
            id={`${id}-custom`}
            value={customText}
            onChange={(text) => {
              onCustomDraftChange?.(id, text);
              onChange({ type: "custom", value: text });
            }}
            placeholder="Eigene Angaben eingeben"
            variant="textarea"
            rows={3}
            hasError={hasError}
          />
        )}
        {hasError && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (q.type === "multi_choice" && q.options) {
    const isCustom = q.allow_custom && isPresetOrCustom(value) && value.type === "custom";
    const arr: string[] =
      q.allow_custom && isPresetOrCustom(value)
        ? value.type === "preset"
          ? Array.isArray(value.value)
            ? value.value
            : [value.value]
          : []
        : Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value
              ? [value]
              : []
            : [];
    const customText = isCustom && isPresetOrCustom(value) ? value.value : (customDraft ?? "");
    const max = q.constraints?.max_selected ?? 99;

    return (
      <div className="space-y-2">
        <Label>{q.question}</Label>
        {q.helper && <p className="text-sm text-muted-foreground">{q.helper}</p>}
        <div className="space-y-2">
          {q.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={o.id === "custom" ? isCustom : !isCustom && arr.includes(o.id)}
                onCheckedChange={(checked) => {
                  if (o.id === "custom") {
                    if (checked) {
                      onChange({ type: "custom", value: customDraft ?? "" });
                    } else {
                      onChange({ type: "preset", value: [] });
                    }
                  } else {
                    if (checked) {
                      if (arr.length < max) onChange({ type: "preset", value: [...arr, o.id] });
                    } else {
                      onChange({ type: "preset", value: arr.filter((x) => x !== o.id) });
                    }
                  }
                }}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
        {q.allow_custom && isCustom && (
          <VoiceInput
            id={`${id}-custom`}
            value={customText}
            onChange={(text) => {
              onCustomDraftChange?.(id, text);
              onChange({ type: "custom", value: text });
            }}
            placeholder="Eigene Angaben eingeben"
            variant="textarea"
            rows={3}
            hasError={hasError}
          />
        )}
        {hasError && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (q.type === "list_text_optional") {
    const v = typeof value === "string" ? value : Array.isArray(value) ? value.join("\n") : "";
    const tooltipContent = q.tooltip_content;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id}>{q.question}</Label>
          {tooltipContent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    aria-label="Info"
                  >
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-left">
                  {tooltipContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {q.helper && <p className="text-sm text-muted-foreground">{q.helper}</p>}
        <VoiceInput
          id={id}
          value={v}
          onChange={(val) => onChange(val)}
          placeholder="Ein Eintrag pro Zeile"
          variant="textarea"
          rows={3}
          hasError={hasError}
        />
        {hasError && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const v = typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : "";
  const isLong = q.type === "short_text" || (q.validation?.max_chars ?? 0) > 120;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{q.question}</Label>
      {q.helper && <p className="text-sm text-muted-foreground">{q.helper}</p>}
      <VoiceInput
        id={id}
        value={v}
        onChange={(val) => onChange(val)}
        variant={isLong ? "textarea" : "input"}
        rows={3}
        hasError={hasError}
      />
      {hasError && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface InputWizardProps {
  projectId: number;
}

export function InputWizard({ projectId }: InputWizardProps) {
  const router = useRouter();

  const competitorsKnownValue = (answers: Record<string, unknown>): string => {
    const v = answers["p1_competitors_known"];
    if (typeof v === "string") return v;
    if (isPresetOrCustom(v) && v.type === "preset") {
      const val = v.value;
      return typeof val === "string" ? val : val?.[0] ?? "";
    }
    return "";
  };

  const getValue = (q: Question, answers: Record<string, unknown>): AnswerValue => {
    const v = answers[q.id];
    if (v !== undefined) return v as AnswerValue;
    if (q.allow_custom) return { type: "preset", value: q.type === "multi_choice" ? [] : "" };
    return (q.type === "multi_choice" ? [] : "") as AnswerValue;
  };

  const isAnswerValidPhase1 = (q: Question, value: unknown, context?: { getValue: (q: Question) => unknown }): boolean => {
    if (q.id === "p1_competitor_names" && context?.getValue) {
      const competitorsKnownQ = PHASE1_QUESTIONS.find((x) => x.id === "p1_competitors_known");
      if (competitorsKnownQ) {
        const knownVal = context.getValue(competitorsKnownQ);
        const known = competitorsKnownValue({ p1_competitors_known: knownVal });
        if (known !== "many" && known !== "some" && known !== "few") return true;
      }
    }
    return isAnswerValid(q, value as AnswerValue);
  };

  const getAnswerErrorPhase1 = (q: Question, value: unknown): string | null => {
    return getAnswerError(q, value as AnswerValue);
  };

  const handleComplete = async (answers: Record<string, unknown>) => {
    const phase1: Record<string, unknown> = {};
    for (const q of PHASE1_QUESTIONS) {
      const v = answers[q.id];
      if (q.type === "list_text_optional") {
        phase1[q.id] =
          typeof v === "string"
            ? (v as string).split(/\n/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
            : [];
      } else if (q.allow_custom && isPresetOrCustom(v)) {
        phase1[q.id] = v;
      } else if (v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
        phase1[q.id] = v;
      }
    }
    const required = [
      "p1_scope_offer",
      "p1_geo_market",
      "p1_offer_type",
      "p1_problem_solved",
      "p1_buyer_type",
      "p1_customer_traits",
      "p1_why_buy",
      "p1_marketing_budget",
      "p1_competitors_known",
      "p1_constraints",
    ];
    const multiChoiceCustomIds = ["p1_customer_traits", "p1_why_buy", "p1_constraints"];
    for (const key of required) {
      const val = phase1[key];
      const isEmpty =
        val === undefined ||
        val === "" ||
        (Array.isArray(val) && val.length === 0) ||
        (isPresetOrCustom(val) &&
          val.type === "preset" &&
          (Array.isArray(val.value) ? val.value.length === 0 : !val.value));
      if (isEmpty) {
        if (key === "p1_customer_traits" || key === "p1_why_buy" || key === "p1_constraints") {
          continue;
        }
        if (PHASE1_CUSTOM_QUESTION_IDS.includes(key as (typeof PHASE1_CUSTOM_QUESTION_IDS)[number])) {
          phase1[key] = multiChoiceCustomIds.includes(key)
            ? { type: "preset" as const, value: ["unknown"] }
            : { type: "preset" as const, value: "unknown" };
        } else {
          phase1[key] = "unknown";
        }
      }
    }
    const rawCompetitors = phase1.p1_competitor_names;
    if (rawCompetitors == null) {
      phase1.p1_competitor_names = [];
    } else if (Array.isArray(rawCompetitors)) {
      const normalized = rawCompetitors
        .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
        .filter(Boolean)
        .slice(0, 3);
      phase1.p1_competitor_names = normalized;
    } else if (typeof rawCompetitors === "string") {
      phase1.p1_competitor_names = (rawCompetitors as string)
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    } else {
      phase1.p1_competitor_names = [];
    }
    await generatePhase1Artifacts({
      projectId,
      answersPhase1: { phase_1: phase1 },
    });
    router.refresh();
  };

  return (
    <ConfigDrivenWizard<Question>
      projectId={String(projectId)}
      phaseId="phase_1"
      stepConfig={PHASE1_STEP_CONFIG}
      questions={PHASE1_QUESTIONS}
      loadAnswers={async () => ({})}
      saveAnswers={async () => {}}
      onComplete={handleComplete}
      lastStepButtonText="Ergebnisse generieren"
      lastStepButtonPendingText="Generiere..."
      isAnswerValid={isAnswerValidPhase1}
      getAnswerError={getAnswerErrorPhase1}
      getValue={(q, answers) => getValue(q, answers)}
      renderStepContent={({
        questionsToRender,
        answers,
        setAnswer,
        getValue: getValueFromWizard,
        touched,
        getError,
        customDrafts,
        setCustomDraft,
      }) => (
        <>
          {questionsToRender.map((q) => {
            if (q.id === "p1_competitor_names") {
              const known = competitorsKnownValue(answers);
              if (known === "unknown") {
                return (
                  <Alert key={q.id} className="border-primary/50 bg-primary/5">
                    <Info className="size-4" />
                    <AlertDescription>
                      Kein Problem, das übernehmen wir für dich! Wir werden jeden relevanten
                      Wettbewerber auf deinem zukünftigen Markt ausfindig machen und für dich
                      analysieren.
                    </AlertDescription>
                  </Alert>
                );
              }
              if (known !== "many" && known !== "some" && known !== "few") {
                return <Fragment key={q.id} />;
              }
            }
            return (
              <QuestionField
                key={q.id}
                q={q}
                value={getValueFromWizard(q) as AnswerValue}
                onChange={(v) => setAnswer(q.id, v)}
                onCustomDraftChange={q.allow_custom ? setCustomDraft : undefined}
                customDraft={q.allow_custom ? customDrafts?.[q.id] : undefined}
                error={getError(q)}
              />
            );
          })}
        </>
      )}
    />
  );
}
