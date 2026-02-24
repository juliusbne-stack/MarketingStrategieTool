/**
 * Stub data for Phase 3 artifacts - schema-compatible JSON per phase3.artifacts.json.
 * No OpenAI calls; used for validation and persistence.
 */

export const PHASE3_VARIANT_IDS = ["option_a", "option_b"] as const;
export type Phase3VariantId = (typeof PHASE3_VARIANT_IDS)[number];

type CompetitiveStrategyStub = {
  type: "cost" | "differentiation" | "focus" | "hybrid";
  rationale: string;
  tradeoffs: string[];
};

type PositioningCanvasStub = {
  target: string;
  problem: string;
  outcome: string;
  approach: string;
  proof: string;
};

type PositioningStub = {
  statement: string;
  market_role: string;
  differentiation: string;
  canvas: PositioningCanvasStub;
};

type BrandVoiceStub = {
  tone: string;
  style_rules: string[];
  do: string[];
  dont: string[];
};

type BrandPrismStub = {
  physique: string[];
  personality: string[];
  culture: string[];
  relationship: string[];
  reflection: string[];
  self_image: string[];
};

type BrandWheelStub = {
  attributes: string[];
  benefits: string[];
  values: string[];
  essence: string;
};

type BrandStub = {
  promise: string;
  values: string[];
  personality: string[];
  voice: BrandVoiceStub;
  prism: BrandPrismStub;
  brand_wheel: BrandWheelStub;
};

type VariantStub = {
  variant_id: Phase3VariantId;
  label: string;
  competitive_strategy: CompetitiveStrategyStub;
  positioning: PositioningStub;
  brand: BrandStub;
};

function createCompetitiveStrategyStub(
  suffix: string,
  type: CompetitiveStrategyStub["type"] = "differentiation"
): CompetitiveStrategyStub {
  return {
    type,
    rationale: `Stub Begründung Wettbewerbsstrategie ${suffix}`,
    tradeoffs: [
      `Stub Trade-off 1 ${suffix}`,
      `Stub Trade-off 2 ${suffix}`,
      `Stub Trade-off 3 ${suffix}`,
    ],
  };
}

function createPositioningCanvasStub(suffix: string): PositioningCanvasStub {
  return {
    target: `Stub Zielgruppe ${suffix}`,
    problem: `Stub Problem ${suffix}`,
    outcome: `Stub Ergebnis ${suffix}`,
    approach: `Stub Ansatz ${suffix}`,
    proof: `Stub Glaubwürdigkeit ${suffix}`,
  };
}

function createPositioningStub(suffix: string): PositioningStub {
  return {
    statement: `Stub Positionierungsstatement ${suffix}`,
    market_role: `Stub Marktrolle ${suffix}`,
    differentiation: `Stub Abgrenzung ${suffix}`,
    canvas: createPositioningCanvasStub(suffix),
  };
}

function createBrandVoiceStub(suffix: string): BrandVoiceStub {
  return {
    tone: `Stub Ton ${suffix}`,
    style_rules: [`Stub Style 1 ${suffix}`, `Stub Style 2 ${suffix}`],
    do: [`Stub Do 1 ${suffix}`, `Stub Do 2 ${suffix}`],
    dont: [`Stub Don't 1 ${suffix}`, `Stub Don't 2 ${suffix}`],
  };
}

function createBrandPrismStub(suffix: string): BrandPrismStub {
  const facet = (name: string) => [`Stub ${name} 1 ${suffix}`, `Stub ${name} 2 ${suffix}`];
  return {
    physique: facet("Physique"),
    personality: facet("Personality"),
    culture: facet("Culture"),
    relationship: facet("Relationship"),
    reflection: facet("Reflection"),
    self_image: facet("SelfImage"),
  };
}

function createBrandWheelStub(suffix: string): BrandWheelStub {
  return {
    attributes: [`Stub Attribut 1 ${suffix}`, `Stub Attribut 2 ${suffix}`],
    benefits: [`Stub Nutzen 1 ${suffix}`, `Stub Nutzen 2 ${suffix}`],
    values: [`Stub Wert 1 ${suffix}`, `Stub Wert 2 ${suffix}`],
    essence: `Stub Essenz ${suffix}`,
  };
}

function createBrandStub(suffix: string): BrandStub {
  return {
    promise: `Stub Markenversprechen ${suffix}`,
    values: [`Stub Wert 1 ${suffix}`, `Stub Wert 2 ${suffix}`],
    personality: [`Stub Persönlichkeit 1 ${suffix}`, `Stub Persönlichkeit 2 ${suffix}`],
    voice: createBrandVoiceStub(suffix),
    prism: createBrandPrismStub(suffix),
    brand_wheel: createBrandWheelStub(suffix),
  };
}

function createVariantStub(
  variantId: Phase3VariantId,
  label: string,
  strategyType: CompetitiveStrategyStub["type"] = "differentiation"
): VariantStub {
  return {
    variant_id: variantId,
    label,
    competitive_strategy: createCompetitiveStrategyStub(variantId, strategyType),
    positioning: createPositioningStub(variantId),
    brand: createBrandStub(variantId),
  };
}

/** Full stub for positioning_brand_variants - 2 variants (option_a, option_b) */
export function createPositioningBrandVariantsStub(
  _notes?: string
): Record<string, unknown> {
  return {
    variants: [
      createVariantStub("option_a", "Option A – Differenzierung", "differentiation"),
      createVariantStub("option_b", "Option B – Fokus", "focus"),
    ],
  };
}

/** Stub for positioning_and_brand_core (single selected variant) */
export function createPositioningAndBrandCoreStub(
  variantId: Phase3VariantId,
  _notes?: string,
  _area?: string
): Record<string, unknown> {
  const variant = createVariantStub(variantId, "Selected");
  return {
    selected_variant_id: variantId,
    competitive_strategy: variant.competitive_strategy,
    positioning: variant.positioning,
    brand: variant.brand,
  };
}

/** Minimal viable stub - schema-compatible minimal fields for simplify */
export function createMinimalPositioningAndBrandCoreStub(): Record<string, unknown> {
  const canvas = {
    target: "Minimal Zielgruppe",
    problem: "Minimal Problem",
    outcome: "Minimal Ergebnis",
    approach: "Minimal Ansatz",
    proof: "Minimal Beweis",
  };
  return {
    selected_variant_id: "option_a" as const,
    competitive_strategy: {
      type: "differentiation" as const,
      rationale: "Minimal Begründung.",
      tradeoffs: ["Trade-off 1"],
    },
    positioning: {
      statement: "Minimal Positionierung.",
      market_role: "Minimal Marktrolle.",
      differentiation: "Minimal Abgrenzung.",
      canvas,
    },
    brand: {
      promise: "Minimal Versprechen.",
      values: ["Wert 1"],
      personality: ["Persönlichkeit 1"],
      voice: {
        tone: "Minimal Ton",
        style_rules: ["Style 1"],
        do: ["Do 1"],
        dont: ["Don't 1"],
      },
      prism: {
        physique: ["P1"],
        personality: ["P2"],
        culture: ["C1"],
        relationship: ["R1"],
        reflection: ["R2"],
        self_image: ["S1"],
      },
      brand_wheel: {
        attributes: ["A1"],
        benefits: ["B1"],
        values: ["V1"],
        essence: "Minimal Essenz",
      },
    },
  };
}
