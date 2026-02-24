/**
 * Reusable preset/custom answer structure for "Eigene Angaben" option.
 * Use for Phase 1–5 questions with allow_custom.
 *
 * - preset: selected option(s) from dropdown/multi-select
 * - custom: free-text "Eigene Angaben" (min 5 chars)
 * - No string fallbacks – KI sees explicit type for custom answers.
 */
import { z } from "zod";

export const presetAnswerSchema = z.object({
  type: z.literal("preset"),
  value: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
});

export const customAnswerSchema = z.object({
  type: z.literal("custom"),
  value: z.string().trim().min(5, "Eigene Angaben: mindestens 5 Zeichen"),
});

export const presetOrCustomSchema = z.discriminatedUnion("type", [
  presetAnswerSchema,
  customAnswerSchema,
]);

export type PresetAnswer = z.infer<typeof presetAnswerSchema>;
export type CustomAnswer = z.infer<typeof customAnswerSchema>;
export type PresetOrCustomAnswer = z.infer<typeof presetOrCustomSchema>;

export function isPresetOrCustom(v: unknown): v is PresetOrCustomAnswer {
  return (
    typeof v === "object" &&
    v !== null &&
    "type" in v &&
    ((v as PresetOrCustomAnswer).type === "preset" || (v as PresetOrCustomAnswer).type === "custom")
  );
}
