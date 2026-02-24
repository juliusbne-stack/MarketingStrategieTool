import { z } from "zod";

export const projectIdSchema = z.number().int().positive();

/**
 * Required question IDs from phase2.questions.json.
 */
const PHASE2_REQUIRED_KEYS = [
  "p2_ambition_level",
  "p2_priority_focus",
  "p2_impact_goal",
  "p2_person_visibility",
  "p2_brand_style",
  "p2_polarization",
  "p2_success_12m",
  "p2_main_development_12_24m",
] as const;

/**
 * Phase2AnswersSchema: validates answers.phase_2 object.
 * Minimal validation: object shape exists for answers.phase_2 (IDs from phase2.questions.json).
 */
export const Phase2AnswersSchema = z.object({
  phase_2: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => {
        for (const key of PHASE2_REQUIRED_KEYS) {
          if (!(key in obj)) return false;
        }
        return true;
      },
      { message: "Missing required phase_2 question keys" }
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

export type Phase2AnswersInput = z.infer<typeof Phase2AnswersSchema>;

const VARIANT_ID = z.enum(["conservative", "balanced", "bold"]);

/**
 * LockVariantSchema: for lockPhase2Variant.
 */
export const LockVariantSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  variantId: VARIANT_ID,
});

export type LockVariantInput = z.infer<typeof LockVariantSchema>;

/**
 * AdjustSchema: for regeneratePhase2Guidelines.
 * selectedAreas optional (task); notes required 8–240.
 * p2_adjust_area: vision/mission/goals; when provided, min 1 max 2.
 */
export const AdjustSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  selectedAreas: z
    .array(z.string().min(1))
    .min(1)
    .max(2)
    .optional(),
  notes: z.string().trim().min(8, "Notes min 8 chars").max(240, "Notes max 240 chars"),
});

export type AdjustInput = z.infer<typeof AdjustSchema>;

/**
 * LockPhase2Schema: for lockPhase2.
 */
export const LockPhase2Schema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type LockPhase2Input = z.infer<typeof LockPhase2Schema>;

/**
 * SimplifySchema: for simplifyPhase2GuidelinesToMinimalViable.
 */
export const SimplifySchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type SimplifyInput = z.infer<typeof SimplifySchema>;

/**
 * GenerateSchema: for generatePhase2GuidelinesThreeVariants.
 */
export const GeneratePhase2Schema = z.object({
  answersPhase2: z.object({
    phase_2: z.record(z.string(), z.unknown()),
  }),
  answersPhase1: z
    .object({
      phase_1: z.record(z.string(), z.unknown()),
    })
    .optional(),
});
