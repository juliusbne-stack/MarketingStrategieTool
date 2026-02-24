/**
 * Phase 5 questions - from cursor-plans/legacy/phase5.questions.json
 */

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  order: number;
  type: "single_choice" | "multi_choice" | "short_text";
  question: string;
  required: boolean;
  options?: QuestionOption[];
  constraints?: { max_selected?: number };
}

export const PHASE5_QUESTIONS: Question[] = [
  {
    id: "p5_start_focus",
    order: 10,
    type: "single_choice" as const,
    question: "Womit möchtest du als Erstes starten?",
    required: true,
    options: [
      { id: "content_pillars", label: "Content-Säulen festlegen" },
      { id: "editorial_plan", label: "Redaktionsplan (4 Wochen) erstellen" },
      { id: "first_assets", label: "Erste Inhalte/Assets erstellen" },
    ],
  },
  {
    id: "p5_channel_activation",
    order: 20,
    type: "single_choice" as const,
    question: "Auf welchen Kanälen sollen zuerst Inhalte entstehen?",
    required: true,
    options: [
      { id: "confirm", label: "Vorauswahl bestätigen" },
      { id: "deactivate_one", label: "1 Kanal deaktivieren" },
      { id: "change_priority", label: "Priorität ändern" },
    ],
  },
  {
    id: "p5_content_depth",
    order: 30,
    type: "single_choice" as const,
    question: "Wie ausführlich sollen deine Inhalte sein?",
    required: true,
    options: [
      { id: "short", label: "Kurz & prägnant" },
      { id: "balanced", label: "Ausgewogen" },
      { id: "deep", label: "Tiefgehend & erklärend" },
    ],
  },
  {
    id: "p5_personal_visibility_in_content",
    order: 40,
    type: "single_choice" as const,
    question: "Wie sichtbar möchtest du persönlich in den Inhalten sein?",
    required: true,
    options: [
      { id: "high", label: "Sehr sichtbar (Ich-Perspektive)" },
      { id: "medium", label: "Teilweise (persönlich, aber sachlich)" },
      { id: "low", label: "Gar nicht (reine Markenkommunikation)" },
    ],
  },
  {
    id: "p5_formats",
    order: 50,
    type: "multi_choice" as const,
    question: "Welche Formate fühlen sich für dich realistisch an?",
    required: true,
    options: [
      { id: "text", label: "Text (Posts, Artikel)" },
      { id: "visual", label: "Visual (Grafiken, Slides)" },
      { id: "video", label: "Video" },
      { id: "audio", label: "Audio" },
      { id: "mix", label: "Mischung" },
    ],
    constraints: { max_selected: 3 },
  },
  {
    id: "p5_frequency",
    order: 60,
    type: "single_choice" as const,
    question: "Wie oft möchtest du realistisch sichtbar sein?",
    required: true,
    options: [
      { id: "low", label: "Eher selten, aber hochwertig" },
      { id: "regular", label: "Regelmäßig & konstant" },
      { id: "high", label: "Sehr präsent" },
    ],
  },
  {
    id: "p5_content_primary_goal",
    order: 70,
    type: "single_choice" as const,
    question: "Was sollen deine Inhalte in erster Linie bewirken?",
    required: true,
    options: [
      { id: "attention", label: "Aufmerksamkeit erzeugen" },
      { id: "trust", label: "Vertrauen & Expertise zeigen" },
      { id: "leads", label: "Anfragen / Leads generieren" },
      { id: "retention", label: "Bestehende Kunden binden" },
    ],
  },
  {
    id: "p5_work_mode",
    order: 80,
    type: "single_choice" as const,
    question: "Wie möchtest du bei der Content-Erstellung arbeiten?",
    required: true,
    options: [
      { id: "self", label: "Alles selbst erstellen" },
      { id: "ai_support", label: "KI als Unterstützung" },
      { id: "ai_heavy", label: "Stark KI-gestützt mit Feinschliff" },
      { id: "outsourced", label: "Teilweise auslagern" },
    ],
  },
  {
    id: "p5_planning_horizon",
    order: 90,
    type: "single_choice" as const,
    question: "Wie weit möchtest du im Voraus planen?",
    required: true,
    options: [
      { id: "2_4_weeks", label: "2–4 Wochen" },
      { id: "1_3_months", label: "1–3 Monate" },
      { id: "3_6_months", label: "3–6 Monate" },
    ],
  },
].sort((a, b) => a.order - b.order);

export const MAX_QUESTIONS_PER_STEP = 2;

/** Phase 5 step config: titles and question grouping */
export interface Phase5StepConfig {
  title: string;
  questionIds: string[];
}

export interface Phase5StepMeta {
  phaseName: string;
  steps: Phase5StepConfig[];
}

/** Phase 5 – Content & Umsetzung */
export const PHASE5_STEP_CONFIG: Phase5StepMeta = {
  phaseName: "Phase 5 – Content & Umsetzung",
  steps: [
    { title: "Content-Pillars & Start", questionIds: ["p5_start_focus", "p5_channel_activation"] },
    { title: "Formate & Tiefe", questionIds: ["p5_content_depth", "p5_formats", "p5_content_primary_goal"] },
    { title: "Frequenz & Sichtbarkeit", questionIds: ["p5_personal_visibility_in_content", "p5_frequency"] },
    { title: "Planung & Umsetzung", questionIds: ["p5_work_mode", "p5_planning_horizon"] },
  ],
};
