import { z } from "zod";

export const projectIdSchema = z.number().int().positive();

/**
 * Required question IDs from phase5.questions.json.
 */
const PHASE5_REQUIRED_KEYS = [
  "p5_start_focus",
  "p5_channel_activation",
  "p5_content_depth",
  "p5_personal_visibility_in_content",
  "p5_formats",
  "p5_frequency",
  "p5_content_primary_goal",
  "p5_work_mode",
  "p5_planning_horizon",
] as const;

/**
 * Phase5AnswersSchema: validates answers.phase_5 object.
 * Minimal validation: object shape exists for answers.phase_5 (IDs from phase5.questions.json).
 */
export const Phase5AnswersSchema = z.object({
  phase_5: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => {
        for (const key of PHASE5_REQUIRED_KEYS) {
          if (!(key in obj)) return false;
        }
        return true;
      },
      { message: "Missing required phase_5 question keys" }
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

export type Phase5AnswersInput = z.infer<typeof Phase5AnswersSchema>;

/**
 * Area options from phase5.process.json p5_adjust_intake.p5_adjust_area.
 * max_selected: 2
 */
const ADJUST_AREA = z.enum([
  "channels",
  "frequency",
  "formats",
  "pillars",
  "editorial",
  "briefings",
  "other",
]);

/**
 * AdjustSchema: for regeneratePhase5FinalPlan.
 * area: max 2 selection per spec.
 * notes: min 8, max 240 (spec says 8–240; phase5.process max_chars: 280 -> use 240 as per task).
 */
export const AdjustSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
  area: z
    .array(ADJUST_AREA)
    .min(1, "At least one area required")
    .max(2, "Max 2 areas per spec"),
  notes: z
    .string()
    .trim()
    .min(8, "Notes min 8 chars")
    .max(240, "Notes max 240 chars"),
});

export type AdjustInput = z.infer<typeof AdjustSchema>;

/**
 * LockSchema: for lockPhase5.
 */
export const LockSchema = z.object({
  projectId: projectIdSchema,
  sessionId: z.number().int().positive(),
});

export type LockInput = z.infer<typeof LockSchema>;
