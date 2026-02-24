import { z } from "zod";
import { presetOrCustomSchema } from "./preset-custom";

export type { PresetOrCustomAnswer } from "./preset-custom";
export { presetAnswerSchema, customAnswerSchema, presetOrCustomSchema, isPresetOrCustom } from "./preset-custom";

/**
 * Required question IDs from phase1.questions.json (p1_competitor_names is optional).
 */
const PHASE1_REQUIRED_KEYS = [
  "p1_company_name",
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
] as const;

/** Questions with "Eigene Angaben" option – answers use preset/custom structure. */
export const PHASE1_CUSTOM_QUESTION_IDS = [
  "p1_company_name",
  "p1_offer_type",
  "p1_buyer_type",
  "p1_customer_traits",
  "p1_why_buy",
  "p1_constraints",
] as const;

/**
 * Phase1AnswersSchema: validates answers.phase_1 object.
 * For PHASE1_CUSTOM_QUESTION_IDS: { type: "preset"|"custom", value }.
 * For others: string | string[] (legacy).
 */
export const Phase1AnswersSchema = z.object({
  phase_1: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => {
        for (const key of PHASE1_REQUIRED_KEYS) {
          if (!(key in obj)) return false;
        }
        return true;
      },
      { message: "Missing required phase_1 question keys" }
    )
    .refine(
      (obj) => {
        for (const key of PHASE1_CUSTOM_QUESTION_IDS) {
          const v = obj[key];
          if (v == null) return false;
          const parsed = presetOrCustomSchema.safeParse(v);
          if (!parsed.success) return false;
        }
        return true;
      },
      { message: "Custom questions must use { type: 'preset'|'custom', value }" }
    )
    .refine(
      (obj) => {
        const v = obj.p1_company_name;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string };
        if (t.type === "preset" && t.value === "no_name") return true;
        if (t.type === "custom") return typeof t.value === "string" && t.value.trim().length >= 2;
        return true;
      },
      { message: "p1_company_name: Preset 'no_name' oder Custom min. 2 Zeichen" }
    )
    .refine(
      (obj) => {
        const v = obj.p1_offer_type;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string };
        if (t.type !== "custom" || typeof t.value !== "string") return true;
        return t.value.trim().length >= 10;
      },
      { message: "p1_offer_type (Eigene Angaben): mindestens 10 Zeichen" }
    )
    .refine(
      (obj) => {
        const v = obj.p1_buyer_type;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string };
        if (t.type !== "custom" || typeof t.value !== "string") return true;
        return t.value.trim().length >= 10;
      },
      { message: "p1_buyer_type (Eigene Angaben): mindestens 10 Zeichen" }
    )
    .refine(
      (obj) => {
        const v = obj.p1_customer_traits;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string | string[] };
        if (t.type === "preset") {
          const val = t.value;
          if (Array.isArray(val)) return val.length >= 1 && val.length <= 2;
          return typeof val === "string" && val.trim().length > 0;
        }
        if (t.type === "custom") {
          return typeof t.value === "string" && t.value.trim().length >= 15;
        }
        return true;
      },
      {
        message:
          "p1_customer_traits: Preset max. 2 Werte; Custom min. 15 Zeichen und exklusiv",
      }
    )
    .refine(
      (obj) => {
        const v = obj.p1_why_buy;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string | string[] };
        if (t.type === "preset") {
          const val = t.value;
          if (Array.isArray(val)) return val.length >= 1 && val.length <= 2;
          return typeof val === "string" && val.trim().length > 0;
        }
        if (t.type === "custom") {
          return typeof t.value === "string" && t.value.trim().length >= 20;
        }
        return true;
      },
      {
        message:
          "p1_why_buy: Preset 1–2 Werte; Custom min. 20 Zeichen und exklusiv",
      }
    )
    .refine(
      (obj) => {
        const v = obj.p1_constraints;
        if (v == null || typeof v !== "object" || !("type" in v)) return true;
        const t = v as { type: string; value?: string | string[] };
        if (t.type === "preset") {
          const val = t.value;
          if (Array.isArray(val)) return val.length >= 1 && val.length <= 2;
          return typeof val === "string" && val.trim().length > 0;
        }
        if (t.type === "custom") {
          return typeof t.value === "string" && t.value.trim().length >= 20;
        }
        return true;
      },
      {
        message:
          "p1_constraints: Preset 1–2 Werte; Custom min. 20 Zeichen und exklusiv",
      }
    )
    .refine(
      (obj) => {
        const v = obj.p1_competitor_names;
        if (v == null) return true;
        const items = Array.isArray(v)
          ? (v as string[]).map((s) => String(s).trim()).filter(Boolean)
          : typeof v === "string"
            ? v.split(/\n/).map((s) => s.trim()).filter(Boolean)
            : [];
        if (items.length === 0) return true;
        const totalChars = items.join("").length;
        const allMin2 = items.every((s) => s.length >= 2);
        return allMin2 || totalChars >= 10;
      },
      {
        message:
          "p1_competitor_names: Wenn angegeben, mind. 2 Zeichen pro Eintrag oder mind. 10 Zeichen Gesamtinhalt",
      }
    )
    .transform((obj) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") out[k] = v.trim();
        else out[k] = v;
      }
      return out;
    }),
});

export type Phase1AnswersInput = z.infer<typeof Phase1AnswersSchema>;

export const projectIdSchema = z.number().int().positive();

/**
 * GenerateSchema: for generatePhase1Artifacts.
 */
export const GenerateSchema = z.object({
  projectId: projectIdSchema,
  answersPhase1: Phase1AnswersSchema,
});

export type GenerateInput = z.infer<typeof GenerateSchema>;

/**
 * RegenerateSchema: for regenerate_phase1_artifacts.
 */
export const RegenerateSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  selectedAreas: z
    .array(z.string().min(1))
    .min(1, "At least one area required")
    .max(2, "At most two areas allowed"),
  notes: z.string().trim().min(8, "Notes min 8 chars").max(240, "Notes max 240 chars"),
  answersPhase1: Phase1AnswersSchema.optional(),
});

export type RegenerateInput = z.infer<typeof RegenerateSchema>;

/**
 * LockSchema: for lockPhase1.
 */
export const LockSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type LockInput = z.infer<typeof LockSchema>;

/**
 * SimplifySchema: for simplifyPhase1ArtifactsToMinimalViable.
 */
export const SimplifySchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type SimplifyInput = z.infer<typeof SimplifySchema>;
