/**
 * Stub data for Phase 2 artifacts - schema-compatible JSON per phase2.artifacts.json.
 * No OpenAI calls; used for validation and persistence.
 */

export const PHASE2_VARIANT_IDS = ["conservative", "balanced", "bold"] as const;
export type Phase2VariantId = (typeof PHASE2_VARIANT_IDS)[number];

type VisionStub = {
  statement: string;
  meaning: string;
  guiding_principle: string;
};

type MissionStub = {
  statement: string;
  focus: string[];
  exclusion: string;
};

type GoalsStub = {
  short_term: string[];
  mid_term: string[];
  long_term: string[];
};

function createVisionStub(suffix: string): VisionStub {
  return {
    statement: `Stub Vision Statement ${suffix}`,
    meaning: `Stub Bedeutung ${suffix}`,
    guiding_principle: `Stub Leitprinzip ${suffix}`,
  };
}

function createMissionStub(suffix: string): MissionStub {
  return {
    statement: `Stub Mission Statement ${suffix}`,
    focus: ["Stub Fokus 1", "Stub Fokus 2"],
    exclusion: `Stub Abgrenzung ${suffix}`,
  };
}

function createGoalsStub(suffix: string): GoalsStub {
  return {
    short_term: [`Stub Kurzfristig 1 ${suffix}`, `Stub Kurzfristig 2 ${suffix}`],
    mid_term: [`Stub Mittelfristig 1 ${suffix}`, `Stub Mittelfristig 2 ${suffix}`],
    long_term: [`Stub Langfristig 1 ${suffix}`, `Stub Langfristig 2 ${suffix}`],
  };
}

/** Full stub for strategic_guidelines_variants - 3 variants (conservative, balanced, bold) */
export function createStrategicGuidelinesVariantsStub(
  _notes?: string
): Record<string, unknown> {
  const labels: Record<Phase2VariantId, string> = {
    conservative: "Solide & vorsichtig",
    balanced: "Ausgewogen",
    bold: "Mutig & ambitioniert",
  };

  return {
    variants: PHASE2_VARIANT_IDS.map((variant_id) => ({
      variant_id,
      label: labels[variant_id],
      vision: createVisionStub(variant_id),
      mission: createMissionStub(variant_id),
      goals: createGoalsStub(variant_id),
    })),
  };
}

/** Stub for strategic_guidelines (single selected variant) */
export function createStrategicGuidelinesStub(
  variantId: Phase2VariantId,
  _notes?: string
): Record<string, unknown> {
  return {
    selected_variant_id: variantId,
    vision: createVisionStub(variantId),
    mission: createMissionStub(variantId),
    goals: createGoalsStub(variantId),
  };
}

/** Minimal viable stub - short vision/mission + 3 goals for simplify */
export function createMinimalStrategicGuidelinesStub(
  variantId: Phase2VariantId = "balanced"
): Record<string, unknown> {
  return {
    selected_variant_id: variantId,
    vision: {
      statement: "Minimal Vision.",
      meaning: "Minimal Bedeutung.",
      guiding_principle: "Minimal Leitprinzip.",
    },
    mission: {
      statement: "Minimal Mission.",
      focus: ["Fokus 1"],
      exclusion: "Minimal Abgrenzung.",
    },
    goals: {
      short_term: ["Ziel 1"],
      mid_term: ["Ziel 2"],
      long_term: ["Ziel 3"],
    },
  };
}
