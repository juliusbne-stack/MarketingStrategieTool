import { z } from "zod";

export const projectIdSchema = z.number().int().positive();

/**
 * Required question IDs from phase3.questions.json.
 */
const PHASE3_REQUIRED_KEYS = [
  "p3_offer_differentiation_sharpness",
  "p3_market_role",
  "p3_brand_emotion",
  "p3_risk_vs_experiment",
  "p3_proof_assets",
] as const;

/**
 * Phase3AnswersSchema: validates answers.phase_3 object.
 * Minimal validation: object shape exists for answers.phase_3 (IDs from phase3.questions.json).
 */
export const Phase3AnswersSchema = z.object({
  phase_3: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => {
        for (const key of PHASE3_REQUIRED_KEYS) {
          if (!(key in obj)) return false;
        }
        return true;
      },
      { message: "Missing required phase_3 question keys" }
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

export type Phase3AnswersInput = z.infer<typeof Phase3AnswersSchema>;

const VARIANT_ID = z.enum(["option_a", "option_b"]);

/**
 * LockVariantSchema: for lockPhase3Variant.
 */
export const LockVariantSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  variantId: VARIANT_ID,
});

export type LockVariantInput = z.infer<typeof LockVariantSchema>;

/**
 * Area options from phase3.process.json p3_adjust_intake.p3_adjust_area.
 */
const ADJUST_AREA = z.enum([
  "competitive_strategy",
  "positioning",
  "brand",
]);

/**
 * AdjustSchema: for regeneratePhase3PositioningBrandCore.
 * notes: min 8, max 240 (per task; phase3.process.json has max 280).
 */
export const AdjustSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  area: ADJUST_AREA,
  notes: z
    .string()
    .trim()
    .min(8, "Notes min 8 chars")
    .max(240, "Notes max 240 chars"),
});

export type AdjustInput = z.infer<typeof AdjustSchema>;

/**
 * LockPhase3Schema: for lockPhase3.
 */
export const LockPhase3Schema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type LockPhase3Input = z.infer<typeof LockPhase3Schema>;

/**
 * SimplifySchema: for simplifyPhase3CoreToMinimalViable.
 */
export const SimplifySchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type SimplifyInput = z.infer<typeof SimplifySchema>;
