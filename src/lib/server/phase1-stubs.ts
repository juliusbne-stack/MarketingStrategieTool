/**
 * Stub data for Phase 1 artifacts - schema-compatible JSON.
 * No OpenAI calls; used for Task 2 validation and persistence.
 */

export const PHASE1_ARTIFACT_KEYS = [
  "strategy_profile",
  "pestel",
  "porter_5_forces",
  "swot",
  "strategic_group_map",
  "market_segmentation",
  "target_profiles",
] as const;

export type Phase1ArtifactKey = (typeof PHASE1_ARTIFACT_KEYS)[number];

/** Full stub for generate - schema-compatible structure */
export function createStubStrategyProfile(_notes?: string): Record<string, unknown> {
  return {
    summary: {
      one_liner: "Stub: Marketing-Strategie für dein Angebot.",
      market_pressure: "medium",
      recommended_direction: "Stub: Fokus auf Differenzierung und Kundennähe.",
    },
    inputs_echo: {
      offer_scope: "regional",
      geo_market: "DACH",
      offer_type: "service",
      buyer_type: "smb",
      budget_band: "medium",
    },
    market: {
      stage: "growing",
      attractiveness: "high",
      key_trends: ["Stub Trend 1"],
    },
    target_group: {
      primary_label: "Marketing-Teams in KMU",
      needs: ["Stub Bedarf"],
      buying_triggers: ["Stub Trigger"],
      objections: ["Stub Einwand"],
    },
    competition: {
      intensity: "medium",
      competitor_names: [],
      differentiation_levers: ["Spezialanpassungen", "Kundenservice", "Expertise"],
    },
    risks: ["Stub Risiko"],
    opportunities: ["Stub Chance"],
    company_name: "",
  };
}

export function createStubPestel(_notes?: string): Record<string, unknown> {
  return {
    label: "Externe Treiber",
    categories: [
      {
        id: "economy",
        title: "Wirtschaft",
        summary: "Ökonomische Rahmenbedingungen.",
        drivers: [
          {
            title: "Stub Treiber",
            description: "Stub Beschreibung.",
            relevance: "Stub Relevanz.",
            implication: "Stub Implikation.",
            sources: [],
          },
        ],
      },
    ],
  };
}

export function createStubPorter5Forces(_notes?: string): Record<string, unknown> {
  return {
    forces: [
      { key: "rivalry", label: "Wettbewerbsintensität im Markt", pressure: 50, insights: ["Stub"] },
      { key: "new_entrants", label: "Bedrohung durch neue Marktteilnehmer", pressure: 50, insights: ["Stub"] },
      { key: "substitutes", label: "Bedrohung durch Ersatzangebote", pressure: 50, insights: ["Stub"] },
      { key: "buyer_power", label: "Verhandlungsmacht der Kunden", pressure: 50, insights: ["Stub"] },
      { key: "supplier_power", label: "Verhandlungsmacht der Lieferanten", pressure: 50, insights: ["Stub"] },
    ],
  };
}

export function createStubSwot(_notes?: string): Record<string, unknown> {
  return {
    strengths: ["Stub Stärke"],
    weaknesses: ["Stub Schwäche"],
    opportunities: ["Stub Chance"],
    threats: ["Stub Bedrohung"],
  };
}

export function createStubStrategicGroupMap(_notes?: string): Record<string, unknown> {
  return {
    axes: { x: "price_level", y: "specialization" },
    points: [
      {
        id: "self",
        name: "Sie",
        is_self: true,
        price_level: 50,
        specialization: 50,
        brand_strength: 50,
        group: "A",
        notes: "Stub",
      },
      {
        id: "comp1",
        name: "Wettbewerber",
        is_self: false,
        price_level: 40,
        specialization: 60,
        brand_strength: 40,
        group: "B",
        notes: "Stub",
      },
    ],
    positioning_space_hint: "Stub Positionierungsraum.",
  };
}

export function createStubMarketSegmentation(_notes?: string): Record<string, unknown> {
  return {
    segments: [
      {
        name: "Stub Segment",
        who: "Stub Zielgruppe",
        need: "Stub Bedarf",
        attractiveness: "medium",
      },
    ],
  };
}

export function createStubTargetProfiles(_notes?: string): Record<string, unknown> {
  return {
    profiles: [
      {
        name: "Stub Profil",
        type: "persona",
        summary: "Stub Zusammenfassung.",
        channels_hint: ["Stub Kanal"],
      },
    ],
  };
}

const STUB_CREATORS: Record<Phase1ArtifactKey, (notes?: string) => Record<string, unknown>> = {
  strategy_profile: createStubStrategyProfile,
  pestel: createStubPestel,
  porter_5_forces: createStubPorter5Forces,
  swot: createStubSwot,
  strategic_group_map: createStubStrategicGroupMap,
  market_segmentation: createStubMarketSegmentation,
  target_profiles: createStubTargetProfiles,
};

export function createStubForArtifactKey(
  key: Phase1ArtifactKey,
  notes?: string
): Record<string, unknown> {
  return STUB_CREATORS[key](notes);
}

/** Minimal viable stub - empty lists, short summary for simplify */
export function createMinimalStubForArtifactKey(
  key: Phase1ArtifactKey
): Record<string, unknown> {
  switch (key) {
    case "strategy_profile":
      return {
        summary: { one_liner: "Minimal.", market_pressure: "medium", recommended_direction: "Minimal." },
        inputs_echo: { offer_scope: "", geo_market: "", offer_type: "", buyer_type: "", budget_band: "unknown" },
        market: { stage: "unknown", attractiveness: "medium", key_trends: [] },
        target_group: { primary_label: "", needs: [], buying_triggers: [], objections: [] },
        competition: { intensity: "medium", competitor_names: [], differentiation_levers: [] },
        risks: [],
        opportunities: [],
      };
    case "pestel":
      return {
        label: "Externe Treiber",
        categories: [],
      };
    case "porter_5_forces":
      return {
        forces: [
          { key: "rivalry", label: "Wettbewerbsintensität im Markt", pressure: 0, insights: [] },
          { key: "new_entrants", label: "Bedrohung durch neue Marktteilnehmer", pressure: 0, insights: [] },
          { key: "substitutes", label: "Bedrohung durch Ersatzangebote", pressure: 0, insights: [] },
          { key: "buyer_power", label: "Verhandlungsmacht der Kunden", pressure: 0, insights: [] },
          { key: "supplier_power", label: "Verhandlungsmacht der Lieferanten", pressure: 0, insights: [] },
        ],
      };
    case "swot":
      return { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    case "strategic_group_map":
      return {
        axes: { x: "price_level", y: "specialization" },
        points: [
          { id: "self", name: "Sie", is_self: true, price_level: 50, specialization: 50, brand_strength: 50, group: "A", notes: "" },
          { id: "other", name: "Andere", is_self: false, price_level: 40, specialization: 40, brand_strength: 40, group: "B", notes: "" },
        ],
        positioning_space_hint: "Minimal.",
      };
    case "market_segmentation":
      return { segments: [] };
    case "target_profiles":
      return { profiles: [] };
    default:
      return createStubForArtifactKey(key);
  }
}
