/**
 * Shared wizard step utilities for Phase 1–5.
 * Single source for getQuestionsForStep, clampStep, step config types.
 */

export interface StepConfig {
  title: string;
  questionIds: string[];
}

export interface PhaseStepMeta {
  phaseName: string;
  steps: StepConfig[];
}

/** Generic question with id for filtering/ordering */
export interface QuestionWithId {
  id: string;
}

/**
 * Returns questions for a step: filtered by questionIds, ordered by questionIds.
 * Dev warning if questionId not found in allQuestions.
 */
export function getQuestionsForStep<T extends QuestionWithId>(
  stepIndex: number,
  stepConfig: PhaseStepMeta,
  allQuestions: T[]
): T[] {
  const step = stepConfig.steps[stepIndex];
  if (!step) return [];
  const questionIds = step.questionIds;
  const idSet = new Set(allQuestions.map((q) => q.id));
  for (const id of questionIds) {
    if (!idSet.has(id) && process.env.NODE_ENV === "development") {
      console.warn(`[Wizard] Step config references unknown question id: ${id}`);
    }
  }
  const questionsToRender = allQuestions.filter((q) => questionIds.includes(q.id));
  const orderMap = new Map(questionIds.map((id, idx) => [id, idx]));
  questionsToRender.sort(
    (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
  );
  return questionsToRender;
}

/** Clamp step to valid range [0, totalSteps-1] */
export function clampStep(step: number, totalSteps: number): number {
  return Math.min(Math.max(step, 0), Math.max(0, totalSteps - 1));
}
