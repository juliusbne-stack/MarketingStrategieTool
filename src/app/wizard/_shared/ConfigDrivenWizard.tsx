"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WizardStepHeader } from "@/app/wizard/_shared/WizardStepHeader";
import { getQuestionsForStep, clampStep, type QuestionWithId } from "@/app/wizard/_shared/wizard-step-utils";

export interface ConfigDrivenWizardStepConfig {
  title: string;
  questionIds: string[];
}

export interface ConfigDrivenWizardStepMeta {
  phaseName: string;
  steps: ConfigDrivenWizardStepConfig[];
}

export interface ConfigDrivenWizardProps<TQuestion extends QuestionWithId> {
  projectId: string;
  phaseId: string;
  stepConfig: ConfigDrivenWizardStepMeta;
  questions: TQuestion[];
  loadAnswers: () => Promise<Record<string, unknown>>;
  saveAnswers: (data: Record<string, unknown>) => Promise<void>;
  onComplete?: (answers: Record<string, unknown>) => Promise<void>;
  lastStepButtonText?: string;
  lastStepButtonPendingText?: string;
  isAnswerValid: (
    q: TQuestion,
    value: unknown,
    context?: { getValue: (q: TQuestion) => unknown }
  ) => boolean;
  getAnswerError: (
    q: TQuestion,
    value: unknown,
    context?: { getValue: (q: TQuestion) => unknown }
  ) => string | null;
  getValue?: (q: TQuestion, answers: Record<string, unknown>) => unknown;
  renderStepContent: (params: {
    questionsToRender: TQuestion[];
    answers: Record<string, unknown>;
    setAnswer: (id: string, value: unknown) => void;
    getValue: (q: TQuestion) => unknown;
    touched: Set<string>;
    getError: (q: TQuestion) => string | null;
    customDrafts?: Record<string, string>;
    setCustomDraft?: (id: string, text: string) => void;
  }) => React.ReactNode;
  containerClassName?: string;
  /** Optional error message shown between content and buttons (e.g. generate action error) */
  error?: string | null;
}

export function ConfigDrivenWizard<TQuestion extends QuestionWithId>({
  projectId: _projectId,
  phaseId: _phaseId,
  stepConfig,
  questions,
  loadAnswers,
  saveAnswers,
  onComplete,
  lastStepButtonText = "Weiter",
  lastStepButtonPendingText = "Generiere...",
  isAnswerValid,
  getAnswerError,
  getValue: getValueProp,
  renderStepContent,
  containerClassName = "mx-auto max-w-2xl space-y-6 p-6",
  error,
}: ConfigDrivenWizardProps<TQuestion>) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const totalSteps = stepConfig.steps.length;
  const safeStep = clampStep(step, totalSteps);
  const questionsToRender = getQuestionsForStep(safeStep, stepConfig, questions);
  const isLastStep = safeStep === totalSteps - 1;
  const progress = totalSteps > 0 ? ((safeStep + 1) / totalSteps) * 100 : 0;

  const getValue = (q: TQuestion): unknown => {
    if (getValueProp) return getValueProp(q, answers);
    const v = answers[q.id];
    if (v !== undefined) return v;
    const qAny = q as { type?: string };
    return qAny.type === "multi_choice" ? [] : "";
  };

  const setAnswer = (qId: string, v: unknown) => {
    setAnswers((prev) => ({ ...prev, [qId]: v }));
  };

  const setCustomDraft = (qId: string, text: string) => {
    setCustomDrafts((prev) => ({ ...prev, [qId]: text }));
  };

  const getError = (q: TQuestion): string | null => {
    if (!touched.has(q.id)) return null;
    return getAnswerError(q, getValue(q), { getValue });
  };

  const isStepValid = questionsToRender.every((q) =>
    isAnswerValid(q, getValue(q), { getValue })
  );

  const markStepTouched = () => {
    setTouched((prev) => {
      const next = new Set(prev);
      questionsToRender.forEach((q) => next.add(q.id));
      return next;
    });
  };

  const handleNext = () => {
    if (isLastStep) return;
    markStepTouched();
    if (!isStepValid) return;
    setStep((prev) => {
      const base = clampStep(prev, totalSteps);
      return Math.min(totalSteps - 1, base + 1);
    });
    void saveAnswers(answers);
  };

  const handleBack = () => {
    setStep((prev) => {
      const base = clampStep(prev, totalSteps);
      return Math.max(0, base - 1);
    });
  };

  const handleLastStepSubmit = () => {
    markStepTouched();
    if (!isStepValid) return;
    if (!onComplete) return;
    startTransition(async () => {
      await saveAnswers(answers);
      await onComplete(answers);
    });
  };

  useEffect(() => {
    loadAnswers().then((data) => {
      setAnswers(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAnswers is from parent, run once on mount
  }, []);

  const stepTitle = stepConfig.steps[safeStep]?.title ?? "";
  const phaseLabel = stepConfig.phaseName;
  const stepIndex1Based = safeStep + 1;

  return (
    <div className={containerClassName}>
      <WizardStepHeader
        phaseLabel={phaseLabel}
        stepIndex1Based={stepIndex1Based}
        totalSteps={totalSteps}
        stepTitle={stepTitle}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default">
              <Progress
                value={progress}
                variant="wizard"
                className="h-2"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {Math.round(progress)}% beantwortet
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="space-y-6">
        {renderStepContent({
          questionsToRender,
          answers,
          setAnswer,
          getValue,
          touched,
          getError,
          customDrafts,
          setCustomDraft,
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={safeStep === 0}>
          Zurück
        </Button>
        {isLastStep ? (
          <Button
            onClick={handleLastStepSubmit}
            disabled={isPending || !isStepValid}
          >
            {isPending ? lastStepButtonPendingText : lastStepButtonText}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!isStepValid}>
            Weiter
          </Button>
        )}
      </div>
    </div>
  );
}
