/**
 * Phase 4 questions - from cursor-plans/legacy/phase4.questions.json
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

export const PHASE4_QUESTIONS: Question[] = [
  {
    id: "p4_marketing_approach_fit",
    order: 10,
    type: "single_choice" as const,
    question: "Passt dieser grundsätzliche Marketing-Ansatz zu dir?",
    required: true,
    options: [
      { id: "yes", label: "Ja, genau so" },
      { id: "mostly", label: "Grundsätzlich ja, aber…" },
      { id: "no", label: "Nein, bitte anpassen" },
    ],
  },
  {
    id: "p4_channel_count",
    order: 20,
    type: "single_choice" as const,
    question: "Wie viele Marketing-Kanäle möchtest du realistisch aktiv bespielen?",
    required: true,
    options: [
      { id: "1_2", label: "1–2 fokussiert" },
      { id: "3_4", label: "3–4 ausgewogen" },
      { id: "many", label: "So viele sinnvoll wie möglich" },
    ],
  },
  {
    id: "p4_execution_owner",
    order: 30,
    type: "single_choice" as const,
    question: "Wer soll die Marketing-Maßnahmen hauptsächlich umsetzen?",
    required: true,
    options: [
      { id: "self", label: "Ich selbst" },
      { id: "mixed", label: "Teilweise ausgelagert" },
      { id: "external", label: "Weitgehend extern (Agentur / Freelancer)" },
      { id: "unclear", label: "Noch unklar" },
    ],
  },
  {
    id: "p4_time_per_week",
    order: 40,
    type: "single_choice" as const,
    question: "Wie viel Zeit kannst du pro Woche realistisch für Marketing aufbringen?",
    required: true,
    options: [
      { id: "lt_2", label: "Unter 2 Stunden" },
      { id: "2_5", label: "2–5 Stunden" },
      { id: "5_10", label: "5–10 Stunden" },
      { id: "gt_10", label: "Mehr als 10 Stunden" },
    ],
  },
  {
    id: "p4_short_term_priority",
    order: 50,
    type: "single_choice" as const,
    question: "Was soll kurzfristig Priorität haben?",
    required: true,
    options: [
      { id: "visibility", label: "Sichtbarkeit aufbauen" },
      { id: "trust", label: "Vertrauen & Expertise zeigen" },
      { id: "leads", label: "Leads / Anfragen generieren" },
      { id: "retention", label: "Bestehende Kunden binden" },
      { id: "clarity", label: "Klarheit & Struktur schaffen" },
    ],
  },
  {
    id: "p4_paid_ads",
    order: 60,
    type: "single_choice" as const,
    question: "Möchtest du bezahlte Werbung einsetzen?",
    required: true,
    options: [
      { id: "yes", label: "Ja, auf jeden Fall" },
      { id: "later", label: "Vielleicht später" },
      { id: "no", label: "Nein, nur organisch" },
      { id: "unknown", label: "Weiß ich noch nicht" },
    ],
  },
  {
    id: "p4_complexity_level",
    order: 70,
    type: "single_choice" as const,
    question: "Wie komplex darf dein Marketing-Setup sein?",
    required: true,
    options: [
      { id: "simple", label: "Möglichst einfach" },
      { id: "balanced", label: "Ausgewogen" },
      { id: "advanced", label: "Darf auch komplexer sein, wenn es wirkt" },
    ],
  },
].sort((a, b) => a.order - b.order);

export const MAX_QUESTIONS_PER_STEP = 2;

/** Phase 4 step config: titles and question grouping */
export interface Phase4StepConfig {
  title: string;
  questionIds: string[];
}

export interface Phase4StepMeta {
  phaseName: string;
  steps: Phase4StepConfig[];
}

/** Phase 4 – Marketing-Mix & Maßnahmen */
export const PHASE4_STEP_CONFIG: Phase4StepMeta = {
  phaseName: "Phase 4 – Marketing-Mix & Maßnahmen",
  steps: [
    { title: "Maßnahmen & Kanäle", questionIds: ["p4_marketing_approach_fit", "p4_channel_count"] },
    { title: "Umsetzung & Ressourcen", questionIds: ["p4_execution_owner", "p4_time_per_week"] },
    { title: "Prioritäten & Budget", questionIds: ["p4_short_term_priority", "p4_paid_ads"] },
    { title: "Komplexität", questionIds: ["p4_complexity_level"] },
  ],
};
