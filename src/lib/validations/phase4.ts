import { z } from "zod";

export const projectIdSchema = z.number().int().positive();

/**
 * Required question IDs from phase4.questions.json.
 */
const PHASE4_REQUIRED_KEYS = [
  "p4_marketing_approach_fit",
  "p4_channel_count",
  "p4_execution_owner",
  "p4_time_per_week",
  "p4_short_term_priority",
  "p4_paid_ads",
  "p4_complexity_level",
] as const;

/**
 * Phase4AnswersSchema: validates answers.phase_4 object.
 * Minimal validation: object shape exists for answers.phase_4 (IDs from phase4.questions.json).
 */
export const Phase4AnswersSchema = z.object({
  phase_4: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => {
        for (const key of PHASE4_REQUIRED_KEYS) {
          if (!(key in obj)) return false;
        }
        return true;
      },
      { message: "Missing required phase_4 question keys" }
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

export type Phase4AnswersInput = z.infer<typeof Phase4AnswersSchema>;

/**
 * Area options from phase4.process.json p4_adjust_intake.p4_adjust_area.
 */
const ADJUST_AREA = z.enum([
  "channels",
  "measures",
  "time",
  "complexity",
  "priority",
  "other",
]);

/**
 * AdjustSchema: for regeneratePhase4FinalPlan.
 * notes: min 8, max 240.
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
 * LockSchema: for lockPhase4.
 */
export const LockSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type LockInput = z.infer<typeof LockSchema>;
