/**
 * Phase 1 questions config - loaded from cursor-plans/legacy/phase1.questions.json
 * Used by Input Wizard for collect_inputs state.
 */

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  order: number;
  type: "text_with_suggestions" | "short_text" | "single_choice" | "multi_choice" | "list_text_optional";
  question: string;
  helper?: string;
  required: boolean;
  options?: QuestionOption[];
  validation?: { min_chars?: number; max_chars?: number; min_items?: number; max_items?: number; max_chars_each?: number };
  constraints?: { max_selected?: number };
  allow_other?: boolean;
  other_label?: string;
  other_max_chars?: number;
  /** When true, adds "Eigene Angaben" option (must appear first). Answer stored as { type: "preset"|"custom", value } */
  allow_custom?: boolean;
  custom_min_chars?: number;
  /** Tooltip content for info icon next to label (e.g. for p1_competitor_names) */
  tooltip_content?: string;
}

export const PHASE1_QUESTIONS: Question[] = [
  {
    id: "p1_company_name",
    order: 5,
    type: "single_choice" as const,
    question: "Wie heißt dein Unternehmen?",
    helper: "Optional. Wenn du noch keinen Namen hast, wähle die erste Option.",
    required: true,
    options: [
      { id: "no_name", label: "Ich habe noch keinen Namen" },
      { id: "custom", label: "Eigene Angaben (Name eingeben)" },
    ],
    allow_custom: true,
    custom_min_chars: 2,
  },
  {
    id: "p1_scope_offer",
    order: 10,
    type: "text_with_suggestions" as const,
    question: "Für welchen Markt oder welches Angebot soll diese Marketing-Strategie entwickelt werden?",
    helper: "Beispiel: „Online-Marketing für meinen Fitnesskurs“ oder „SaaS für Recruiting“",
    required: true,
    validation: { min_chars: 5, max_chars: 160 },
  },
  {
    id: "p1_geo_market",
    order: 20,
    type: "single_choice" as const,
    question: "In welchem geografischen Markt bewegst du dich hauptsächlich?",
    required: true,
    options: [
      { id: "local", label: "Lokal" },
      { id: "regional", label: "Regional" },
      { id: "national", label: "National" },
      { id: "international", label: "International" },
    ],
    allow_other: true,
    other_label: "Andere (kurz)",
    other_max_chars: 80,
  },
  {
    id: "p1_offer_type",
    order: 30,
    type: "single_choice" as const,
    question: "Was verkaufst du hauptsächlich?",
    helper:
      "Wähle die Kategorie, die dein Kerngeschäft am besten beschreibt. Wenn keine passt, nutze ‚Eigene Angaben‘.",
    required: true,
    options: [
      { id: "custom", label: "Eigene Angaben" },
      { id: "physical", label: "Physisches Produkt (z. B. Konsumgüter, Hardware)" },
      { id: "digital", label: "Digitale Produkte (z. B. Software, Online-Kurse, Lizenzen)" },
      { id: "service", label: "Dienstleistung (z. B. Beratung, Agentur, Handwerk)" },
      { id: "platform", label: "Plattform / Marktplatz (verbindet Anbieter & Nachfrager)" },
      { id: "subscription", label: "Abonnement / Membership (wiederkehrender Nutzen)" },
      { id: "hybrid", label: "Hybrides Angebot (Kombination aus Produkt & Service)" },
    ],
    allow_custom: true,
    custom_min_chars: 10,
  },
  {
    id: "p1_problem_solved",
    order: 40,
    type: "short_text" as const,
    question: "Welches Problem löst dein Angebot?",
    helper: "1 Satz reicht. Beispiel: „Ich helfe X dabei, Y zu erreichen.“",
    required: true,
    validation: { min_chars: 10, max_chars: 220 },
  },
  {
    id: "p1_buyer_type",
    order: 50,
    type: "single_choice" as const,
    question: "Wer kauft dein Angebot?",
    helper:
      "Wähle die Kundengruppe, die die Kaufentscheidung hauptsächlich trifft. Wenn mehrere Gruppen relevant sind oder keine passt, nutze ‚Eigene Angaben‘.",
    required: true,
    options: [
      { id: "custom", label: "Eigene Angaben" },
      { id: "b2c", label: "Endkunden (B2C – Privatpersonen)" },
      { id: "smb", label: "Kleine Unternehmen / Selbstständige" },
      { id: "midmarket", label: "Mittelständische Unternehmen" },
      { id: "enterprise", label: "Große Unternehmen / Konzerne" },
      { id: "public", label: "Öffentliche Institutionen / Organisationen" },
      { id: "hybrid", label: "Andere Unternehmen UND Endkunden (Hybrid)" },
    ],
    allow_custom: true,
    custom_min_chars: 10,
  },
  {
    id: "p1_customer_traits",
    order: 60,
    type: "multi_choice" as const,
    question: "Welche Beschreibung passt am ehesten zu deinen Kunden?",
    helper:
      "Wähle bis zu zwei Beschreibungen, die das Entscheidungsverhalten deiner Kunden am besten charakterisieren. Wenn keine passt, nutze ‚Eigene Angaben‘.",
    required: true,
    options: [
      { id: "custom", label: "Eigene Angaben" },
      { id: "price_conscious", label: "Preisbewusst und vergleicht viele Optionen" },
      { id: "quality_oriented", label: "Qualitätsorientiert und bereit, mehr zu zahlen" },
      { id: "solution_focused", label: "Stark lösungsorientiert (will ein konkretes Problem schnell lösen)" },
      { id: "risk_averse", label: "Sicherheits- und risikoavers" },
      { id: "innovation_open", label: "Innovations- und technologieoffen" },
      { id: "trust_recommendations", label: "Wertet Empfehlungen und Vertrauen besonders hoch" },
    ],
    constraints: { max_selected: 2 },
    allow_custom: true,
    custom_min_chars: 15,
  },
  {
    id: "p1_why_buy",
    order: 70,
    type: "multi_choice" as const,
    question: "Warum sollten Kunden bei dir kaufen – und nicht woanders?",
    helper:
      "Wähle bis zu zwei Gründe, warum sich Kunden bewusst für dich entscheiden sollten. Wenn dein Vorteil komplexer ist, nutze ‚Eigene Angaben‘.",
    required: true,
    options: [
      { id: "custom", label: "Eigene Angaben" },
      { id: "price_value", label: "Besseres Preis-Leistungs-Verhältnis" },
      { id: "quality", label: "Höhere Qualität / bessere Ergebnisse" },
      { id: "specialization", label: "Spezialisierung auf ein klares Problem oder eine Nische" },
      { id: "ease_use", label: "Einfachere Nutzung / geringere Komplexität" },
      { id: "speed", label: "Schnellerer Service / kürzere Reaktionszeiten" },
      { id: "trust_care", label: "Mehr Vertrauen / bessere Betreuung" },
    ],
    constraints: { max_selected: 2 },
    allow_custom: true,
    custom_min_chars: 20,
  },
  {
    id: "p1_marketing_budget",
    order: 80,
    type: "single_choice" as const,
    question: "Wie sieht dein Marketing-Budget aktuell aus?",
    helper: "Das hilft, die Strategie realistisch zu planen. Eine grobe Angabe reicht.",
    required: true,
    options: [
      { id: "none", label: "0 € (nur organisch)" },
      { id: "low", label: "Klein (bis ca. 300 €/Monat)" },
      { id: "medium", label: "Mittel (300–1.500 €/Monat)" },
      { id: "high", label: "Höher (1.500 €+/Monat)" },
      { id: "unknown", label: "Weiß ich noch nicht" },
    ],
    allow_other: true,
    other_label: "Andere (kurz)",
    other_max_chars: 60,
  },
  {
    id: "p1_competitors_known",
    order: 90,
    type: "single_choice" as const,
    question: "Kennst du andere Anbieter, die etwas Ähnliches machen?",
    required: true,
    options: [
      { id: "many", label: "Ja, viele" },
      { id: "some", label: "Ja, ein paar" },
      { id: "few", label: "Kaum" },
      { id: "unknown", label: "Nein / Weiß ich nicht" },
    ],
  },
  {
    id: "p1_competitor_names",
    order: 100,
    type: "list_text_optional" as const,
    question: "Wettbewerber (optional)",
    helper: "Nenne 1–3 bekannte Wettbewerber (optional).",
    required: false,
    validation: { max_items: 3, max_chars_each: 60 },
    tooltip_content:
      "Liste 1–3 Wettbewerber, idealerweise je Zeile.\nOptional: Website-Link, Stichpunkte (z. B. Preis, Zielgruppe, Positionierung) oder warum dieser Anbieter besonders relevant ist.\nWenn ein Wettbewerber für dich besonders wichtig ist, markiere ihn z. B. mit 'PRIORITÄT:'.",
  },
  {
    id: "p1_constraints",
    order: 110,
    type: "multi_choice" as const,
    question: "Gibt es etwas, das dein Business einschränkt oder besonders beeinflusst?",
    helper:
      "Wähle bis zu zwei Faktoren, die deine strategischen Möglichkeiten einschränken oder stark beeinflussen. Wenn deine Situation komplexer ist, nutze ‚Eigene Angaben‘.",
    required: true,
    options: [
      { id: "custom", label: "Eigene Angaben" },
      { id: "limited_marketing_budget", label: "Begrenztes Marketing-Budget" },
      { id: "limited_resources", label: "Begrenzte Zeit / personelle Ressourcen" },
      { id: "strong_competition", label: "Starker Wettbewerb im Markt" },
      { id: "platform_dependency", label: "Abhängigkeit von externen Plattformen oder Partnern" },
      { id: "regulatory", label: "Regulatorische / rechtliche Vorgaben" },
      { id: "low_brand_awareness", label: "Geringe Markenbekanntheit" },
    ],
    constraints: { max_selected: 2 },
    allow_custom: true,
    custom_min_chars: 20,
  },
].sort((a, b) => a.order - b.order);

/** Max 2 questions per step (phase1.process.json step_rules) */
export const MAX_QUESTIONS_PER_STEP = 2;

/** Phase 1 step config: titles and question grouping (from phase meta / process) */
export interface Phase1StepConfig {
  title: string;
  questionIds: string[];
}

export interface Phase1StepMeta {
  phaseName: string;
  steps: Phase1StepConfig[];
}

/** Phase 1 – Situationsanalyse: max 1–2 Fragen pro Seite */
export const PHASE1_STEP_CONFIG: Phase1StepMeta = {
  phaseName: "Phase 1 – Situationsanalyse",
  steps: [
    { title: "Dein Unternehmen", questionIds: ["p1_company_name"] },
    { title: "Dein Angebot", questionIds: ["p1_scope_offer"] },
    { title: "Markt & Geschäftsmodell", questionIds: ["p1_geo_market", "p1_offer_type"] },
    { title: "Wertversprechen", questionIds: ["p1_problem_solved"] },
    { title: "Käufer & Entscheidungsstruktur", questionIds: ["p1_buyer_type"] },
    { title: "Kundenprofil", questionIds: ["p1_customer_traits"] },
    { title: "Kaufmotivation", questionIds: ["p1_why_buy"] },
    { title: "Marketing-Budget", questionIds: ["p1_marketing_budget"] },
    { title: "Wettbewerb", questionIds: ["p1_competitors_known", "p1_competitor_names"] },
    { title: "Strategische Rahmenbedingungen", questionIds: ["p1_constraints"] },
  ],
};

/** Build steps from config: each step = array of Question objects in order */
export function getPhase1Steps(): Question[][] {
  const idToQuestion = new Map(PHASE1_QUESTIONS.map((q) => [q.id, q]));
  return PHASE1_STEP_CONFIG.steps.map((step) =>
    step.questionIds
      .map((id) => idToQuestion.get(id))
      .filter((q): q is Question => q != null)
  );
}
