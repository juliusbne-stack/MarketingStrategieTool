/**
 * Zod schemas for Phase 1 artifacts - derived from phase1.artifacts.json.
 * Used for server-side validation of OpenAI outputs.
 */

import { z } from "zod";

const marketPressureEnum = z.enum(["low", "medium", "high"]);
const budgetBandEnum = z.enum(["none", "low", "medium", "high", "unknown"]);
const marketStageEnum = z.enum(["emerging", "growing", "mature", "unknown"]);
const pestelKeyEnum = z.enum(["P", "E", "S", "T", "ECO", "L"]);

/** External Drivers (Externe Treiber) - replaces PESTEL dimensions with category/driver structure */
const ExternalDriverSourceSchema = z.object({
  name: z.string(),
  url: z.string(), // validated server-side via verifyUrl before persist
  /** ISO YYYY-MM-DD – required for OpenAI strict mode; use "" when unknown */
  date: z.string(),
});

const relevanceEnum = z.enum(["high", "medium", "low"]);
const impactTypeEnum = z.enum(["chance", "risk"]);
const impactLevelEnum = z.enum(["high", "medium"]);

const ExternalDriverSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  summary: z.string().optional(),
  relevance: z.string().optional(),
  implication: z.string().optional(),
  relevanceReason: z.string().optional(),
  strategicImplication: z.string().optional(),
  impactType: impactTypeEnum.optional(),
  impactLevel: impactLevelEnum.optional(),
  validated: z.boolean().optional(),
  sources: z.array(ExternalDriverSourceSchema).default([]),
});

const ExternalDriversCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  relevance: relevanceEnum.optional(),
  drivers: z.array(ExternalDriverSchema).default([]),
});

export const ExternalDriversSchema = z.object({
  label: z.literal("Externe Treiber").optional(),
  categories: z.array(ExternalDriversCategorySchema).default([]),
});
const porterKeyEnum = z.enum([
  "rivalry",
  "new_entrants",
  "substitutes",
  "buyer_power",
  "supplier_power",
]);
const attractivenessEnum = z.enum(["low", "medium", "high"]);
const profileTypeEnum = z.enum(["persona", "sinus_like_profile"]);

const strategyProfileSummarySchema = z.object({
  one_liner: z.string().max(180),
  market_pressure: marketPressureEnum,
  recommended_direction: z.string().max(240),
});

const strategyProfileInputsEchoSchema = z.object({
  offer_scope: z.string(),
  geo_market: z.string(),
  offer_type: z.string(),
  buyer_type: z.string(),
  budget_band: budgetBandEnum,
});

const strategyProfileMarketSchema = z.object({
  stage: marketStageEnum,
  attractiveness: marketPressureEnum,
  key_trends: z.array(z.string()).max(6),
});

const strategyProfileTargetGroupSchema = z.object({
  primary_label: z.string(),
  needs: z.array(z.string()).max(6),
  buying_triggers: z.array(z.string()).max(6),
  objections: z.array(z.string()).max(6),
});

const strategyProfileCompetitionSchema = z.object({
  intensity: marketPressureEnum,
  competitor_names: z.array(z.string()).max(5),
  differentiation_levers: z.array(z.string()).max(6),
});

export const StrategyProfileSchema = z.object({
  summary: strategyProfileSummarySchema,
  inputs_echo: strategyProfileInputsEchoSchema,
  market: strategyProfileMarketSchema,
  target_group: strategyProfileTargetGroupSchema,
  competition: strategyProfileCompetitionSchema,
  risks: z.array(z.string()).max(8),
  opportunities: z.array(z.string()).max(8),
  /** Company name for Umfeld-Insights diagram (from p1_company_name) */
  company_name: z.string().optional(),
});

export const PestelDimensionSchema = z.object({
  key: pestelKeyEnum,
  label: z.string(),
  impact: z.number().int().min(0).max(100),
  notes: z.array(z.string()).max(4),
});

/** @deprecated Use ExternalDriversSchema for pestel artifact (UI: "Externe Treiber") */
export const PestelSchema = ExternalDriversSchema;

/** Eintrittsbarriere mit Stärke und Begründung */
const EntryBarrierSchema = z.object({
  name: z.string(),
  strength: z.enum(["Niedrig", "Mittel", "Hoch"]),
  rationale: z.string().max(300),
  /** Detaillierte Vertiefung beim Aufklappen – Fließtext oder Stichpunkte, nur echte/relevante Infos */
  details: z.string().max(1200).optional(),
});

/** Detaillierte Analyse für "Bedrohung durch neue Marktteilnehmer" – aus Marktrecherche */
export const NewEntrantsDetailedSchema = z.object({
  /** Stabilität der Bewertung (wie sicher ist die Einschätzung?) */
  stability_level: z.enum(["Niedrig", "Mittel", "Hoch"]),
  /** Kurzfazit & Einfluss auf Wettbewerb – zusammenhängender Text (3–5 Sätze) */
  short_summary: z.string().max(900),
  /** Einfluss auf Preise, Margen, Wettbewerb – bei Refinement identisch mit short_summary */
  competition_impact: z.string().max(900),
  /** 3–5 zentrale Eintrittsbarrieren mit Stärke und Begründung */
  entry_barriers: z.array(EntryBarrierSchema).min(3).max(5),
  /** Realistische potenzielle neue Marktteilnehmer (keine Fantasiebeispiele) */
  potential_new_entrants: z.array(z.string()).max(6),
  /** Wechselwirkungen mit anderen Porter-Kräften – Ursache–Wirkung */
  porter_interactions: z.string().max(500),
  /** Frühindikatoren: technologisch, wirtschaftlich, regulatorisch */
  early_indicators: z.string().max(500),
  /** Strategische Implikation – worauf fokussieren? */
  strategic_implication: z.string().max(500),
});

/** Top-Substitut mit Relevanz und Begründung (für substitutes) */
const TopSubstituteSchema = z.object({
  name: z.string(),
  relevanz: z.enum(["Hoch", "Mittel", "Niedrig"]),
  why_attractive: z.string().max(300),
  examples: z.string().max(200).optional(),
});

/** Detaillierte Analyse für "Bedrohung durch Ersatzangebote" – aus Marktrecherche */
export const SubstitutesDetailedSchema = z.object({
  stability_level: z.enum(["Niedrig", "Mittel", "Hoch"]),
  short_summary: z.string().max(900),
  competition_impact: z.string().max(900),
  top_substitutes: z.array(TopSubstituteSchema).min(3).max(5),
  switch_triggers: z.array(z.string()).min(4).max(6),
  protection_factors: z.array(z.string()).min(3).max(5),
  porter_interactions: z.string().max(500),
  early_indicators: z.string().max(500),
  strategic_implication: z.string().max(600),
});

export const PorterForceSchema = z.object({
  key: porterKeyEnum,
  label: z.string(),
  pressure: z.number().int().min(0).max(100),
  insights: z.array(z.string()).max(5),
  /** Konkrete Marktakteure oder Unternehmen (optional) */
  market_actors: z.array(z.string()).max(5).optional(),
  /** Strategischer Insight – neue Perspektive, entscheidungsrelevant (optional) */
  strategic_insight: z.string().max(400).optional(),
  /** URLs der für diese Kraft genutzten Quellen (optional, für Abwärtskompatibilität) */
  source_urls: z.array(z.string()).optional(),
  /** Unternehmen mit URL für klickbare Links im Text – nur mit url klickbar */
  entity_links: z.array(z.object({ name: z.string(), url: z.string().optional() })).optional(),
  /** Detaillierte Analyse für new_entrants oder substitutes – aus Marktrecherche */
  detailed_analysis: z
    .union([NewEntrantsDetailedSchema, SubstitutesDetailedSchema])
    .optional(),
});

export const PorterConclusionSchema = z.object({
  market_attractiveness_summary: z.string().max(500).optional(),
  biggest_risks: z.array(z.string()).max(5).optional(),
  biggest_opportunities: z.array(z.string()).max(5).optional(),
  strategic_directions: z.array(z.string()).max(5).optional(),
});

/** Quelle aus der Web-Recherche (für Porter/PESTEL) */
const PorterSourceSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  date: z.string().optional(),
});

export const Porter5ForcesSchema = z.object({
  forces: z.array(PorterForceSchema).min(5).max(5),
  conclusion: PorterConclusionSchema.optional(),
  /** Genutzte Quellen aus der Web-Recherche (für new_entrants-Block) */
  sources: z.array(PorterSourceSchema).optional(),
});

export const SwotSchema = z.object({
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  opportunities: z.array(z.string()).max(6),
  threats: z.array(z.string()).max(6),
});

export const StrategicGroupMapPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_self: z.boolean(),
  price_level: z.number().min(0).max(100),
  specialization: z.number().min(0).max(100),
  brand_strength: z.number().min(0).max(100),
  group: z.string(),
  notes: z.string().max(180),
});

export const StrategicGroupMapSchema = z.object({
  axes: z.object({
    x: z.literal("price_level"),
    y: z.literal("specialization"),
  }),
  points: z.array(StrategicGroupMapPointSchema).min(2).max(10),
  positioning_space_hint: z.string().max(240),
});

export const MarketSegmentationSegmentSchema = z.object({
  name: z.string(),
  who: z.string(),
  need: z.string(),
  attractiveness: attractivenessEnum,
});

export const MarketSegmentationSchema = z.object({
  segments: z.array(MarketSegmentationSegmentSchema).max(6),
});

export const TargetProfileSchema = z.object({
  name: z.string(),
  type: profileTypeEnum,
  summary: z.string().max(280),
  channels_hint: z.array(z.string()).max(5),
});

export const TargetProfilesSchema = z.object({
  profiles: z.array(TargetProfileSchema).max(4),
});

/** Map artifact key to schema */
export const PHASE1_ARTIFACT_SCHEMAS = {
  strategy_profile: StrategyProfileSchema,
  pestel: ExternalDriversSchema,
  porter_5_forces: Porter5ForcesSchema,
  swot: SwotSchema,
  strategic_group_map: StrategicGroupMapSchema,
  market_segmentation: MarketSegmentationSchema,
  target_profiles: TargetProfilesSchema,
} as const;

export type Phase1ArtifactKey = keyof typeof PHASE1_ARTIFACT_SCHEMAS;

export const PHASE1_ARTIFACT_KEYS: Phase1ArtifactKey[] = [
  "strategy_profile",
  "pestel",
  "porter_5_forces",
  "swot",
  "strategic_group_map",
  "market_segmentation",
  "target_profiles",
];
