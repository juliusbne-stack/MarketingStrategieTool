"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  PHASE1_ARTIFACT_KEYS,
  PHASE1_ARTIFACT_SCHEMAS,
  StrategyProfileSchema,
  type Phase1ArtifactKey,
} from "@/lib/validations/phase1-artifacts";

/** OpenAI strict mode: all properties required. Pestel schema variant without optional fields. */
const PestelSchemaForOpenAI = z.object({
  label: z.literal("Externe Treiber"),
  categories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      relevance: z.enum(["high", "medium", "low", ""]),
      drivers: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          summary: z.string(),
          relevance: z.enum(["high", "medium", "low", ""]),
          implication: z.string(),
          relevanceReason: z.string(),
          strategicImplication: z.string(),
          impactType: z.enum(["chance", "risk", ""]),
          impactLevel: z.enum(["high", "medium", ""]),
          validated: z.boolean(),
          sources: z.array(
            z.object({
              name: z.string(),
              url: z.string(),
              date: z.string(),
            })
          ),
        })
      ),
    })
  ),
});

/** OpenAI strict mode: all properties required. Porter schema variant without optional fields. */
const porterKeyEnum = z.enum([
  "rivalry",
  "new_entrants",
  "substitutes",
  "buyer_power",
  "supplier_power",
]);
/** OpenAI strict JSON: every key in `properties` must appear in `required` — no optional fields. */
const EntryBarrierSchemaForOpenAI = z.object({
  name: z.string(),
  strength: z.enum(["Niedrig", "Mittel", "Hoch"]),
  rationale: z.string().max(300),
  details: z.string().max(1200),
});
const NewEntrantsDetailedSchemaForOpenAI = z.object({
  stability_level: z.enum(["Niedrig", "Mittel", "Hoch"]),
  short_summary: z.string().max(400),
  competition_impact: z.string().max(500),
  entry_barriers: z.array(EntryBarrierSchemaForOpenAI).min(3).max(5),
  potential_new_entrants: z.array(z.string()).max(6),
  porter_interactions: z.string().max(500),
  early_indicators: z.string().max(500),
  strategic_implication: z.string().max(500),
});
const TopSubstituteSchemaForOpenAI = z.object({
  name: z.string(),
  relevanz: z.enum(["Hoch", "Mittel", "Niedrig"]),
  why_attractive: z.string().max(300),
  examples: z.string().max(200),
});
const SubstitutesDetailedSchemaForOpenAI = z.object({
  stability_level: z.enum(["Niedrig", "Mittel", "Hoch"]),
  short_summary: z.string().max(400),
  competition_impact: z.string().max(500),
  top_substitutes: z.array(TopSubstituteSchemaForOpenAI).min(3).max(5),
  switch_triggers: z.array(z.string()).min(4).max(6),
  protection_factors: z.array(z.string()).min(3).max(5),
  porter_interactions: z.string().max(500),
  early_indicators: z.string().max(500),
  strategic_implication: z.string().max(600),
});
const PorterForceSchemaForOpenAI = z.object({
  key: porterKeyEnum,
  label: z.string(),
  pressure: z.number().int().min(0).max(100),
  insights: z.array(z.string()).max(5),
  market_actors: z.array(z.string()).max(5),
  strategic_insight: z.string().max(400),
  /** Union: NewEntrants/Substitutes schema or {} for forces without detailed analysis */
  detailed_analysis: z.union([
    NewEntrantsDetailedSchemaForOpenAI,
    SubstitutesDetailedSchemaForOpenAI,
    z.object({}),
  ]),
});
const PorterConclusionSchemaForOpenAI = z.object({
  market_attractiveness_summary: z.string().max(500),
  biggest_risks: z.array(z.string()).max(5),
  biggest_opportunities: z.array(z.string()).max(5),
  strategic_directions: z.array(z.string()).max(5),
});
const Porter5ForcesSchemaForOpenAI = z.object({
  forces: z.array(PorterForceSchemaForOpenAI).min(5).max(5),
  conclusion: PorterConclusionSchemaForOpenAI,
});

const SYSTEM_PROMPT = `Du bist ein Senior Strategy Consultant (McKinsey/BCG Stil). Du agierst als persönlicher Marketingberater deines Klienten.

DU-FORM (PFLICHT): Alle Ausgaben müssen den Leser mit "du" ansprechen. Er soll sich persönlich angesprochen fühlen. Keine Sie-Form, keine unpersönliche "man"-Formulierung.

Deine Aufgabe: Situationsanalyse-Artefakte für ein Marketing-Strategie-Projekt erstellen.

Regeln:
- Liefere realistische, konkrete, nicht-generische Inhalte.
- Keine Füllwörter, klare und präzise Sprache.
- SWOT: maximal 6 Items pro Feld (strengths, weaknesses, opportunities, threats).
- pestel (Externe Treiber): categories mit id, title, summary, drivers. Jeder driver: title, description (2–6 Sätze), relevance, implication, sources (name, url, date – ISO YYYY-MM-DD oder leer wenn unbekannt). Gib nur gültige http/https URLs – sie werden serverseitig verifiziert.
- Alle anderen Arrays: maximal die in der Spezifikation erlaubte Anzahl.
- Antworte NUR mit gültigem JSON – keine Erklärungen, keine Markdown-Blöcke, kein Text außerhalb des JSON.`;

function buildUserPrompt(
  answers: Record<string, unknown>,
  options?: { selectedAreas?: string[]; notes?: string; existingContext?: Record<string, unknown> }
): string {
  const parts: string[] = [];
  const hasAnswers = answers && Object.keys(answers).length > 0;

  if (hasAnswers) {
    const offerType = answers.p1_offer_type as { type?: string; value?: string } | undefined;
    if (
      offerType &&
      typeof offerType === "object" &&
      offerType.type === "custom" &&
      typeof offerType.value === "string" &&
      offerType.value.trim().length > 0
    ) {
      parts.push("## Regel: Eigene Angaben bei Angebotsart");
      parts.push(
        "Bei der Frage „Was verkaufst du hauptsächlich?“ wurde „Eigene Angaben“ gewählt. Behandle den angegebenen Text als primäre Angebotsdefinition. Leite daraus explizit Angebotsart, Marktmechanik, Wettbewerbslogik und strategische Implikationen ab. Ignoriere Preset-Kategorien."
      );
    }
    const buyerType = answers.p1_buyer_type as { type?: string; value?: string } | undefined;
    if (
      buyerType &&
      typeof buyerType === "object" &&
      buyerType.type === "custom" &&
      typeof buyerType.value === "string" &&
      buyerType.value.trim().length > 0
    ) {
      parts.push("## Regel: Eigene Angaben bei Kaufentscheider");
      parts.push(
        "Wenn bei der Frage „Wer kauft dein Angebot?“ type = custom ist, interpretiere den Text als Beschreibung der kaufentscheidenden Rolle(n). Leite daraus Entscheidungslogik, Kaufmotive, typische Einwände und relevante Marktmechaniken ab."
      );
    }
    const customerTraits = answers.p1_customer_traits as
      | { type?: string; value?: string | string[] }
      | undefined;
    if (
      customerTraits &&
      typeof customerTraits === "object" &&
      customerTraits.type === "custom" &&
      typeof customerTraits.value === "string" &&
      customerTraits.value.trim().length > 0
    ) {
      parts.push("## Regel: Eigene Angaben bei Kundenbeschreibung");
      parts.push(
        "Wenn bei der Frage „Welche Beschreibung passt am ehesten zu deinen Kunden?“ type = custom ist, interpretiere den Text als psychografisches Kundenprofil. Leite daraus Kaufmotive, Trigger, Einwände, Preissensitivität und bevorzugte Argumentationsmuster ab."
      );
    }
    if (
      customerTraits &&
      typeof customerTraits === "object" &&
      customerTraits.type === "preset" &&
      Array.isArray(customerTraits.value) &&
      customerTraits.value.length > 1
    ) {
      parts.push("## Regel: Mehrere Presets bei Kundenbeschreibung");
      parts.push(
        "Wenn bei der Frage „Welche Beschreibung passt am ehesten zu deinen Kunden?“ mehrere Presets gewählt wurden, kombiniere sie zu einem konsistenten psychografischen Profil."
      );
    }
    const whyBuy = answers.p1_why_buy as
      | { type?: string; value?: string | string[] }
      | undefined;
    if (
      whyBuy &&
      typeof whyBuy === "object" &&
      whyBuy.type === "custom" &&
      typeof whyBuy.value === "string" &&
      whyBuy.value.trim().length > 0
    ) {
      parts.push("## Regel: Eigene Angaben bei Differenzierung (Warum bei dir kaufen)");
      parts.push(
        "Wenn bei der Frage „Warum sollten Kunden bei dir kaufen – und nicht woanders?“ type = custom ist, interpretiere den Text als zentrale Differenzierungslogik (Value Proposition). Nutze ihn explizit für Strategy Profile (recommended_direction), SWOT (Strengths) und Porter (Wettbewerbsintensität / Rivalry / Substitutes)."
      );
    }
    if (
      whyBuy &&
      typeof whyBuy === "object" &&
      whyBuy.type === "preset" &&
      Array.isArray(whyBuy.value) &&
      whyBuy.value.length > 1
    ) {
      parts.push("## Regel: Mehrere Presets bei Differenzierung");
      parts.push(
        "Wenn bei der Frage „Warum sollten Kunden bei dir kaufen – und nicht woanders?“ mehrere Presets gewählt wurden, kombiniere sie zu einer klaren, konsistenten Value Proposition. Nutze diese für Strategy Profile, SWOT (Strengths) und Porter."
      );
    }
    const constraints = answers.p1_constraints as
      | { type?: string; value?: string | string[] }
      | undefined;
    if (
      constraints &&
      typeof constraints === "object" &&
      constraints.type === "custom" &&
      typeof constraints.value === "string" &&
      constraints.value.trim().length > 0
    ) {
      parts.push("## Regel: Eigene Angaben bei strategischen Einschränkungen");
      parts.push(
        "Wenn bei der Frage „Gibt es etwas, das dein Business einschränkt oder besonders beeinflusst?“ type = custom ist, interpretiere den Text als strategischen Constraint-Kontext. Berücksichtige diese Einschränkungen explizit bei PESTEL, SWOT (Weaknesses / Threats) und im Strategy Profile (market_pressure, recommended_direction)."
      );
    }
    if (
      constraints &&
      typeof constraints === "object" &&
      constraints.type === "preset" &&
      Array.isArray(constraints.value) &&
      constraints.value.length > 0
    ) {
      parts.push("## Regel: Presets bei strategischen Einschränkungen");
      parts.push(
        "Wenn bei der Frage „Gibt es etwas, das dein Business einschränkt oder besonders beeinflusst?“ Presets gewählt wurden, leite daraus realistische strategische Konsequenzen und Priorisierungen ab. Berücksichtige diese Einschränkungen explizit bei PESTEL, SWOT (Weaknesses / Threats) und im Strategy Profile (market_pressure, recommended_direction)."
      );
    }
    parts.push("## Eingaben (Phase 1 Antworten)");
    parts.push(JSON.stringify(answers, null, 0));
  }

  if (options?.selectedAreas?.length && options?.notes) {
    parts.push("\n## Anpassungswunsch (Regenerate)");
    parts.push(`Bereiche: ${options.selectedAreas.join(", ")}`);
    parts.push(`Notizen: ${options.notes}`);
  }

  if (options?.existingContext && Object.keys(options.existingContext).length > 0) {
    parts.push("\n## Bisheriger Kontext (aus vorheriger Generierung)");
    parts.push(JSON.stringify(options.existingContext, null, 0));
  }

  parts.push("\n## Aufgabe");
  if (options?.selectedAreas?.length) {
    parts.push(
      `Verbessere die Artefakte für die genannten Bereiche basierend auf den Notizen. Gib trotzdem alle 7 Artefakte zurück – die angepassten Bereiche verbessert, die übrigen konsistent zum Kontext.`
    );
  } else {
    parts.push(
      "Generiere alle 7 Artefakte: strategy_profile, pestel, porter_5_forces, swot, strategic_group_map, market_segmentation, target_profiles."
    );
  }
  parts.push(
    "Antworte mit einem JSON-Objekt, dessen Keys exakt diese Artifact-IDs sind. Keine zusätzlichen Felder."
  );

  return parts.join("\n");
}

function validateAndParseArtifacts(
  raw: Record<string, unknown>
): Record<Phase1ArtifactKey, Record<string, unknown>> {
  const result: Partial<Record<Phase1ArtifactKey, Record<string, unknown>>> = {};
  for (const key of PHASE1_ARTIFACT_KEYS) {
    const value = raw[key];
    if (value == null || typeof value !== "object") {
      throw new Error(`Missing or invalid artifact: ${key}`);
    }
    const schema = PHASE1_ARTIFACT_SCHEMAS[key];
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const err = parsed.error as { issues?: Array<{ message?: string }> };
      const messages =
        err.issues?.map((i) => i.message ?? "").filter(Boolean).join("; ") ??
        String(parsed.error);
      throw new Error(`Validation failed for ${key}: ${messages}`);
    }
    result[key] = parsed.data as Record<string, unknown>;
  }
  return result as Record<Phase1ArtifactKey, Record<string, unknown>>;
}

export type GeneratePhase1Input = {
  /** Phase 1 answers (required for generate, optional for regenerate) */
  answersPhase1?: Record<string, unknown>;
  selectedAreas?: string[];
  notes?: string;
  /** Existing strategy_profile for regenerate context */
  existingStrategyProfile?: Record<string, unknown>;
  /** True when called from regeneratePhase1Artifacts – enables merge of competitor_names when awareness=unknown */
  isRegenerate?: boolean;
};

/**
 * Generates Phase 1 artifacts via OpenAI.
 * Validates with Zod; on failure, runs one repair retry.
 */
function getCompetitorAwareness(answers: Record<string, unknown>): string {
  const v = answers.p1_competitors_known;
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "type" in v && (v as { type: string }).type === "preset") {
    const val = (v as { value?: string | string[] }).value;
    return typeof val === "string" ? val : (Array.isArray(val) ? val[0] : "") ?? "";
  }
  return "";
}

export async function generatePhase1ArtifactsWithOpenAI(
  input: GeneratePhase1Input
): Promise<Record<Phase1ArtifactKey, Record<string, unknown>>> {
  const answers = { ...(input.answersPhase1 ?? {}) };
  const awareness = getCompetitorAwareness(answers);
  if (input.isRegenerate && awareness === "unknown") {
    const existingComp = input.existingStrategyProfile?.competition as
      | { competitor_names?: string[] }
      | undefined;
    const existingNames = existingComp?.competitor_names ?? [];
    const keyMissing = !("p1_competitor_names" in answers);
    const current = answers.p1_competitor_names;
    const isEmpty =
      current == null ||
      (Array.isArray(current) && current.length === 0) ||
      (typeof current === "string" && current.trim() === "");
    if ((keyMissing || isEmpty) && existingNames.length > 0) {
      answers.p1_competitor_names = existingNames;
    }
  }
  const userPrompt = buildUserPrompt(answers, {
    selectedAreas: input.selectedAreas,
    notes: input.notes,
    existingContext: input.existingStrategyProfile,
  });

  /** OpenAI strict mode requires all properties in required[] – company_name is optional
   *  and injected from p1_company_name in phase1-actions, so omit it from the AI schema. */
  const strategyProfileSchemaForOpenAI = StrategyProfileSchema.omit({
    company_name: true,
  });

  const fullSchema = z.object({
    strategy_profile: strategyProfileSchemaForOpenAI,
    pestel: PestelSchemaForOpenAI,
    porter_5_forces: Porter5ForcesSchemaForOpenAI,
    swot: PHASE1_ARTIFACT_SCHEMAS.swot,
    strategic_group_map: PHASE1_ARTIFACT_SCHEMAS.strategic_group_map,
    market_segmentation: PHASE1_ARTIFACT_SCHEMAS.market_segmentation,
    target_profiles: PHASE1_ARTIFACT_SCHEMAS.target_profiles,
  });

  async function doGenerate(repairErrors?: string): Promise<Record<string, unknown>> {
    const prompt =
      repairErrors
        ? `${userPrompt}\n\n---\nVorheriger Validierungsfehler (bitte beheben):\n${repairErrors}\nAntworte erneut mit korrektem JSON.`
        : userPrompt;

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: fullSchema,
      system: SYSTEM_PROMPT,
      prompt,
    });

    return object as unknown as Record<string, unknown>;
  }

  function cleanPorterForValidation(obj: Record<string, unknown>): Record<string, unknown> {
    const p5 = obj.porter_5_forces as { forces?: Array<Record<string, unknown>> } | undefined;
    if (!p5?.forces) return obj;
    return {
      ...obj,
      porter_5_forces: {
        ...p5,
        forces: p5.forces.map((f) => {
          const da = f.detailed_analysis;
          if (da && typeof da === "object" && Object.keys(da).length === 0) {
            const { detailed_analysis, ...rest } = f;
            return rest;
          }
          return f;
        }),
      },
    };
  }

  let raw = await doGenerate();
  let lastError: string | null = null;

  try {
    return validateAndParseArtifacts(cleanPorterForValidation(raw));
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
  }

  raw = await doGenerate(lastError);
  try {
    return validateAndParseArtifacts(cleanPorterForValidation(raw));
  } catch (err) {
    throw new Error(
      `Phase 1 generation failed after repair retry: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
