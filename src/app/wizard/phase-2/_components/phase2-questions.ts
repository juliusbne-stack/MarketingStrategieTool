/**
 * Phase 2 questions - from cursor-plans/legacy/phase2.questions.json
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

export const PHASE2_QUESTIONS: Question[] = [
  { id: "p2_ambition_level", order: 10, type: "single_choice" as const, question: "Wie ambitioniert soll diese Strategie sein?", required: true, options: [{ id: "realistic", label: "Solide & realistisch" }, { id: "growth", label: "Wachstumsorientiert" }, { id: "market_leader", label: "Sehr ambitioniert / Marktführerschaft" }, { id: "cautious", label: "Lieber vorsichtig starten" }] },
  { id: "p2_priority_focus", order: 20, type: "single_choice" as const, question: "Was ist dir aktuell wichtiger?", required: true, options: [{ id: "fast_results", label: "Schnelle Ergebnisse" }, { id: "brand_building", label: "Nachhaltiger Markenaufbau" }, { id: "balanced", label: "Beides ausgewogen" }] },
  { id: "p2_impact_goal", order: 30, type: "single_choice" as const, question: "Welche Veränderung möchtest du mit deinem Unternehmen bewirken?", required: true, options: [{ id: "make_customers_successful", label: "Kunden erfolgreicher machen" }, { id: "simplify_processes", label: "Prozesse vereinfachen" }, { id: "clarity_orientation", label: "Orientierung & Klarheit schaffen" }, { id: "drive_innovation", label: "Innovation vorantreiben" }, { id: "stability_security", label: "Sicherheit & Stabilität geben" }, { id: "unknown", label: "Weiß ich nicht genau" }] },
  { id: "p2_person_visibility", order: 40, type: "single_choice" as const, question: "Wie stark soll deine Person in der Marke sichtbar sein?", required: true, options: [{ id: "high", label: "Sehr stark (Personal Brand)" }, { id: "medium", label: "Teilweise" }, { id: "low", label: "Gar nicht / nur Unternehmen" }] },
  { id: "p2_brand_style", order: 50, type: "single_choice" as const, question: "Welche Beschreibung passt am ehesten zu deiner Marke?", required: true, options: [{ id: "serious_professional", label: "Seriös & professionell" }, { id: "bold_clear", label: "Mutig & klar" }, { id: "personal_warm", label: "Persönlich & nahbar" }, { id: "innovative_modern", label: "Innovativ & modern" }, { id: "calm_trustworthy", label: "Ruhig & vertrauensvoll" }] },
  { id: "p2_polarization", order: 60, type: "single_choice" as const, question: "Soll sich deine Marke klar abgrenzen – auch wenn sie polarisiert?", required: true, options: [{ id: "clear_edge", label: "Ja, klare Kante" }, { id: "moderate", label: "Moderat" }, { id: "broad_neutral", label: "Lieber breit & neutral" }] },
  { id: "p2_success_12m", order: 70, type: "multi_choice" as const, question: "Woran würdest du in 12 Monaten erkennen, dass diese Strategie erfolgreich war?", required: true, options: [{ id: "more_revenue", label: "Mehr Umsatz" }, { id: "more_leads", label: "Mehr Anfragen / Leads" }, { id: "more_visibility", label: "Stärkere Sichtbarkeit" }, { id: "clearer_positioning", label: "Klarere Positionierung" }, { id: "more_ideal_customers", label: "Mehr Wunschkunden" }, { id: "predictable_growth", label: "Besser planbares Wachstum" }], constraints: { max_selected: 3 } },
  { id: "p2_main_development_12_24m", order: 80, type: "single_choice" as const, question: "Was soll sich in den nächsten 12–24 Monaten am stärksten entwickeln?", required: true, options: [{ id: "revenue", label: "Umsatz" }, { id: "customers", label: "Kundenanzahl" }, { id: "brand", label: "Bekanntheit / Marke" }, { id: "specialization", label: "Angebotstiefe / Spezialisierung" }, { id: "team_structure", label: "Team / Struktur" }, { id: "unknown", label: "Weiß ich noch nicht" }] },
].sort((a, b) => a.order - b.order);

export const MAX_QUESTIONS_PER_STEP = 2;

/** Phase 2 step config: titles and question grouping */
export interface Phase2StepConfig {
  title: string;
  questionIds: string[];
}

export interface Phase2StepMeta {
  phaseName: string;
  steps: Phase2StepConfig[];
}

/** Phase 2 – Strategische Leitplanken */
export const PHASE2_STEP_CONFIG: Phase2StepMeta = {
  phaseName: "Phase 2 – Strategische Leitplanken",
  steps: [
    { title: "Ziele & Ambition", questionIds: ["p2_ambition_level", "p2_priority_focus", "p2_impact_goal"] },
    { title: "Marke & Stil", questionIds: ["p2_person_visibility", "p2_brand_style", "p2_polarization"] },
    { title: "Erfolg & Entwicklung", questionIds: ["p2_success_12m", "p2_main_development_12_24m"] },
  ],
};
