/**
 * Phase 3 questions - from cursor-plans/legacy/phase3.questions.json
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

export const PHASE3_QUESTIONS: Question[] = [
  {
    id: "p3_offer_differentiation_sharpness",
    order: 10,
    type: "single_choice" as const,
    question: "Wie klar soll sich dein Angebot von anderen abheben?",
    required: true,
    options: [
      { id: "very_sharp", label: "Sehr klar – lieber weniger Kunden, aber die richtigen" },
      { id: "sharp", label: "Klar, aber nicht zu spitz" },
      { id: "broad", label: "Eher breit, um viele anzusprechen" },
    ],
  },
  {
    id: "p3_market_role",
    order: 20,
    type: "single_choice" as const,
    question: "Welche Rolle möchtest du in deinem Markt einnehmen?",
    required: true,
    options: [
      { id: "specialist_expert", label: "Spezialist / Experte" },
      { id: "trusted_guide", label: "Vertrauenswürdiger Begleiter" },
      { id: "innovative_leader", label: "Innovativer Vorreiter" },
      { id: "solid_allrounder", label: "Solider Allrounder" },
    ],
  },
  {
    id: "p3_brand_emotion",
    order: 30,
    type: "single_choice" as const,
    question: "Wie sollen sich Menschen fühlen, wenn sie an deine Marke denken?",
    required: true,
    options: [
      { id: "safe_supported", label: "Sicher & gut aufgehoben" },
      { id: "motivated_inspired", label: "Motiviert & inspiriert" },
      { id: "clear_oriented", label: "Klar & orientiert" },
      { id: "challenged_activated", label: "Herausgefordert & aktiviert" },
      { id: "calm_relaxed", label: "Ruhig & entspannt" },
    ],
  },
  {
    id: "p3_risk_vs_experiment",
    order: 40,
    type: "single_choice" as const,
    question: "Wie wichtig ist dir Sicherheit gegenüber Experimenten?",
    required: true,
    options: [
      { id: "safe", label: "Lieber bewährt & sicher" },
      { id: "balanced", label: "Ausgewogen" },
      { id: "experimental", label: "Offen für neue Wege" },
    ],
  },
  {
    id: "p3_proof_assets",
    order: 50,
    type: "multi_choice" as const,
    question: "Welche Art von Beweisen/Vertrauenssignalen kannst du realistisch zeigen?",
    required: true,
    options: [
      { id: "cases", label: "Ergebnisse / Cases" },
      { id: "testimonials", label: "Kundenstimmen" },
      { id: "expertise", label: "Eigene Expertise (Erfahrung, Background)" },
      { id: "process", label: "Klare Methode / Prozess" },
      { id: "community", label: "Community / Reichweite" },
      { id: "none_yet", label: "Noch nichts davon" },
    ],
    constraints: { max_selected: 3 },
  },
].sort((a, b) => a.order - b.order);

export const MAX_QUESTIONS_PER_STEP = 2;

/** Phase 3 step config: titles and question grouping */
export interface Phase3StepConfig {
  title: string;
  questionIds: string[];
}

export interface Phase3StepMeta {
  phaseName: string;
  steps: Phase3StepConfig[];
}

/** Phase 3 – Positionierung & Marke */
export const PHASE3_STEP_CONFIG: Phase3StepMeta = {
  phaseName: "Phase 3 – Positionierung & Marke",
  steps: [
    { title: "Positionierung & Differenzierung", questionIds: ["p3_offer_differentiation_sharpness", "p3_market_role"] },
    { title: "Brand Voice & Emotion", questionIds: ["p3_brand_emotion", "p3_risk_vs_experiment"] },
    { title: "Beweise & Vertrauen", questionIds: ["p3_proof_assets"] },
  ],
};
