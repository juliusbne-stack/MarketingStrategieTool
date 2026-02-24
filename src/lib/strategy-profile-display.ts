/**
 * Display layer for strategy_profile: value mapping + tooltip dictionary.
 * Marketing-Anfänger: verständliche Labels, keine Halluzination.
 * @see src/lib/validations/phase1-artifacts.ts (Schema)
 */

/** Cluster IDs for display mapping (matches mapper cluster titles) */
export type ClusterId =
  | "Markt & Reichweite"
  | "Für wen"
  | "Angebot"
  | "Leitlinie"
  | "Warum Kunden dich wählen"
  | "Marktbedingungen";

/** Accent border class per cluster (border-l-4 + color, non-evaluative) */
export const CLUSTER_ACCENT_CLASSES: Record<ClusterId, string> = {
  "Markt & Reichweite": "border-l-4 border-l-blue-500 pl-4",
  "Für wen": "border-l-4 border-l-indigo-500 pl-4",
  Angebot: "border-l-4 border-l-cyan-500 pl-4",
  Leitlinie: "border-l-4 border-l-amber-500 pl-4",
  "Warum Kunden dich wählen": "border-l-4 border-l-emerald-500 pl-4",
  Marktbedingungen: "border-l-4 border-l-violet-500 pl-4",
};

/** Area accent: Where to play (Saphirblau) / How to win (Stahlblau) – border only, no bg */
export const AREA_ACCENT_CLASSES = {
  where: "border-l-[4px] border-l-[#0F52BA]",
  how: "border-l-[4px] border-l-[#4682B4]",
} as const;

/** Area text accent for pill header (icon + title) – no bg */
export const AREA_TEXT_ACCENT = {
  where: "text-[#0F52BA]",
  how: "text-[#4682B4]",
} as const;

/** Text color for pill header per cluster (matches accent) */
export const CLUSTER_TEXT_CLASSES: Record<ClusterId, string> = {
  "Markt & Reichweite": "text-blue-500",
  "Für wen": "text-indigo-500",
  Angebot: "text-cyan-500",
  Leitlinie: "text-amber-500",
  "Warum Kunden dich wählen": "text-emerald-500",
  Marktbedingungen: "text-violet-500",
};

/** Lucide icon name per cluster (for strategy-profile-card) */
export const CLUSTER_ICON_NAMES: Record<ClusterId, string> = {
  "Markt & Reichweite": "globe",
  "Für wen": "users",
  Angebot: "package",
  Leitlinie: "compass",
  "Warum Kunden dich wählen": "sparkles",
  Marktbedingungen: "bar-chart",
};

/** "Was das für dich heißt" – 1-line insight per cluster (generic, no hallucination) */
export const CLUSTER_IMPACT_LINES: Record<ClusterId, string> = {
  "Markt & Reichweite":
    "Je klarer dein Markt-Fokus, desto leichter wird Marketing & Positionierung.",
  "Für wen":
    "Sprich die Kaufentscheidung an: Ergebnis, Risiko, Zeitersparnis – nicht Features.",
  Angebot:
    "Mach sofort klar: welches Ergebnis du lieferst und für wen.",
  Leitlinie:
    "Diese Leitlinie ist dein Filter für Entscheidungen in Content & Kanälen.",
  "Warum Kunden dich wählen":
    "Diese Punkte müssen in jeder Landingpage und jedem Pitch auftauchen.",
  Marktbedingungen:
    "Nutze diese Einordnung, um Preis/Positionierung realistisch zu wählen.",
};

/** Maps internal values to German, beginner-friendly display text */
export const VALUE_LABELS: Record<string, Record<string, string>> = {
  buyer_type: {
    smb: "KMU-Entscheider (Geschäftsführung/Leitung)",
    sme: "KMU-Entscheider (Geschäftsführung/Leitung)",
    enterprise: "Entscheider: Großunternehmen",
    b2b: "Geschäftskunden (B2B)",
    b2c: "Privatkunden (B2C)",
    consumer: "Privatkunden",
    mixed: "Gemischte Zielgruppe (B2B & B2C)",
  },
  market_stage: {
    emerging: "Markt entsteht",
    growing: "Wachsender Markt",
    mature: "Markt reif",
    declining: "Markt schrumpft",
    unknown: "Unbekannt",
  },
  intensity: {
    low: "gering",
    medium: "mittel",
    high: "hoch",
  },
  attractiveness: {
    low: "gering",
    medium: "mittel",
    high: "hoch",
  },
  market_pressure: {
    low: "gering",
    medium: "mittel",
    high: "hoch",
  },
  budget_band: {
    none: "Kein Budget",
    low: "Niedriges Budget",
    medium: "Mittleres Budget",
    high: "Hohes Budget",
    unknown: "Unbekannt",
  },
  offer_type: {
    product: "Produkt",
    service: "Dienstleistung",
    software: "Software / SaaS",
    hybrid: "Produkt + Dienstleistung",
    subscription: "Abo-Modell",
  },
  offer_scope: {
    niche: "Nische",
    regional: "Regional",
    national: "National",
    international: "International",
    global: "Global",
  },
  differentiator: {
    Spezialanpassungen: "Individuelle Anpassungen an Kundenbedarf",
    Kundenservice: "Kundenservice",
    Preis: "Preis",
    Qualität: "Qualität",
    Innovation: "Innovation",
    Marke: "Marke",
    Geschwindigkeit: "Geschwindigkeit",
    Expertise: "Fachwissen",
  },
};

/** Capitalize first letter of each word. Safe for German (ä, ö, ü, ß) – no /\b\w/ regex. */
function capitalizeWords(s: string): string {
  return s
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/** Humanize unknown values: capitalize + replace underscores */
export function humanizeValue(val: string): string {
  if (!val || typeof val !== "string") return "—";
  const trimmed = val.trim();
  if (!trimmed) return "—";
  return capitalizeWords(trimmed.replace(/_/g, " "));
}

/** Get display label for a value; fallback to humanize */
export function getDisplayLabel(
  fieldKey: string,
  rawValue: string
): string {
  if (!rawValue || typeof rawValue !== "string") return "—";
  const key = rawValue.trim().toLowerCase();
  const map = VALUE_LABELS[fieldKey];
  if (map) {
    const exact = map[rawValue.trim()] ?? map[key];
    if (exact) return exact;
  }
  // differentiator: check for partial match (e.g. "Spezialanpassungen" in text)
  if (fieldKey === "differentiator") {
    for (const [k, v] of Object.entries(VALUE_LABELS.differentiator ?? {})) {
      if (rawValue.includes(k) || key.includes(k.toLowerCase())) return v;
    }
  }
  return humanizeValue(rawValue);
}

/** Tooltip content: Bedeutung, Warum wichtig, Implikation, Strategische Implikation */
export interface TooltipContent {
  meaning: string;
  whyImportant: string;
  implication: string;
  nextStep: string;
}

export const TOOLTIP_DICTIONARY: Record<string, TooltipContent> = {
  market_scope: {
    meaning: "Der geografische oder sachliche Markt, in dem du aktiv bist.",
    whyImportant: "Definiert deinen Aktionsradius und potenzielle Reichweite.",
    implication: "Fokussiere deine Ressourcen auf diesen Markt.",
    nextStep:
      "Diese Einordnung bedeutet einen klaren geografischen Fokus. Daraus ergibt sich die Bedeutung von Zielregionen und regulatorischen Anforderungen für deine Strategie.",
  },
  market_stage: {
    meaning: "Die Entwicklungsphase des Marktes (entstehend, wachsend, reif).",
    whyImportant: "Bestimmt Wachstumspotenzial und Wettbewerbsdynamik.",
    implication: "Passe deine Strategie an die Marktphase an.",
    nextStep:
      "Diese Einordnung wirkt sich auf Wachstumspotenzial und Wettbewerbsdynamik aus. Daraus ergibt sich die Relevanz von Markttrends und möglicher Anpassungen für die nächste Phase.",
  },
  target_group: {
    meaning: "Die primäre Zielgruppe, die du ansprechen willst.",
    whyImportant: "Ohne klare Zielgruppe verpuffen Marketingmaßnahmen.",
    implication: "Richte alle Botschaften und Kanäle auf diese Gruppe aus.",
    nextStep:
      "Diese Einordnung bedeutet eine klare Zielgruppenfokussierung. Daraus ergibt sich die Bedeutung detaillierter Personas mit konkreten Bedürfnissen und Einwänden.",
  },
  buyer_type: {
    meaning: "Wer trifft die Kaufentscheidung (KMU, Großunternehmen, Privatkunden).",
    whyImportant: "B2B und B2C erfordern unterschiedliche Ansprache und Prozesse.",
    implication: "Wähle passende Vertriebs- und Marketingkanäle.",
    nextStep:
      "Diese Einordnung wirkt sich auf Vertriebs- und Marketingkanäle aus. Daraus ergibt sich die Relevanz von Nutzenargumenten, die für den Entscheiderkreis sofort ROI zeigen.",
  },
  offer_type: {
    meaning: "Art deines Angebots (Produkt, Dienstleistung, Software).",
    whyImportant: "Bestimmt Preislogik, Skalierbarkeit und Kundenerwartungen.",
    implication: "Strukturiere dein Geschäftsmodell entsprechend.",
    nextStep:
      "Diese Einordnung wirkt sich auf Preislogik, Skalierbarkeit und Kundenerwartungen aus. Daraus ergibt sich die Bedeutung eines Value Proposition Canvas für diesen Angebotstyp.",
  },
  offer_scope: {
    meaning: "Umfang deines Angebots (Nische, regional, national, global).",
    whyImportant: "Definiert Ressourcenbedarf und Markteintrittsstrategie.",
    implication: "Priorisiere Märkte und skaliere schrittweise.",
    nextStep:
      "Diese Einordnung bedeutet einen klaren räumlichen oder sachlichen Umfang. Daraus ergibt sich die Relevanz von Prioritäten für geografische oder sachliche Erweiterung.",
  },
  strategic_direction: {
    meaning: "Die empfohlene strategische Ausrichtung für dein Geschäft.",
    whyImportant: "Gibt Orientierung für alle strategischen Entscheidungen.",
    implication: "Nutze sie als Leitlinie für Prioritäten und Investitionen.",
    nextStep:
      "Diese Leitlinie wirkt sich auf alle strategischen Entscheidungen aus. Daraus ergibt sich die Bedeutung messbarer strategischer Ziele.",
  },
  differentiator: {
    meaning: "Eigenschaften, die dich vom Wettbewerb unterscheiden.",
    whyImportant: "Kunden wählen dich nur, wenn sie einen Mehrwert erkennen.",
    implication: "Kommuniziere diese Vorteile klar und konsistent.",
    nextStep:
      "Diese Einordnung bedeutet klare Differenzierer. Daraus ergibt sich die Notwendigkeit, diese in allen Kommunikationskanälen konsistent zu kommunizieren.",
  },
  competition_intensity: {
    meaning: "Wie stark der Wettbewerb in deinem Markt ist.",
    whyImportant: "Beeinflusst Preissetzung, Differenzierung und Markteintritt.",
    implication: "Bei hohem Wettbewerb: klare Differenzierung nötig.",
    nextStep:
      "Diese Einordnung wirkt sich auf Preissetzung, Differenzierung und Markteintritt aus. Daraus ergibt sich die Relevanz der Kenntnis der Wettbewerberpositionierung.",
  },
  market_attractiveness: {
    meaning: "Wie attraktiv der Markt für dein Geschäft ist.",
    whyImportant: "Hilft bei der Priorisierung von Märkten und Segmenten.",
    implication: "Fokussiere auf attraktive Märkte mit passendem Fit.",
    nextStep:
      "Diese Einordnung wirkt sich auf die Priorisierung von Märkten und Segmenten aus. Daraus ergibt sich die Bedeutung eines Fit zwischen Attraktivität und Wettbewerbsvorteil.",
  },
};

/** Raw strategy profile artifact (from phase1) */
export type StrategyProfileData = Record<string, unknown>;

/** ========== Executive-Level Formatierungsfunktionen (Display-Layer) ========== */

/** Hero-Statement: klare, prägnante Sätze, keine Verschachtelung, Executive-Level */
export function formatHeroStatement(statementText: string): string {
  if (!statementText || typeof statementText !== "string") return "";
  let s = statementText.trim();
  if (!s) return "";

  // "mit Fokus auf X" → "– mit klarem X-Fokus" (prägnanter, Executive-Level)
  s = s.replace(
    /\bmit Fokus auf ([^.,;–]+?)(?=[.,;]|$)/gi,
    (_, x) => `– mit klarem ${x.trim()}-Fokus`
  );

  // "Industriekunden-X" → "X für Industriekunden" (Vereinfachung verschachtelter Komposita)
  s = s.replace(
    /Industriekunden-([A-Za-zäöüß]+)/g,
    (_, rest) => `${rest} für Industriekunden`
  );

  // Doppelte Bindestriche bereinigen
  s = s.replace(/\s*–\s*–/g, " – ");
  return s.trim();
}

/** Fokus-Satz: vollständiger Satz, Executive-Level, semantisch präzise */
export function formatFocusSentence(
  marketScope: string,
  targetGroup: string,
  differentiator: string
): string {
  const scope = marketScope?.trim() || "";
  const target = targetGroup?.trim() || "";
  const diff = differentiator?.trim() || "";

  if (!scope && !target && !diff) return "";

  const hasScope = scope && scope !== "—";
  const hasTarget = target && target !== "—";
  const hasDiff = diff && diff !== "—";

  const scopeKey = Object.keys(SCOPE_TO_DATIVE).find((k) => k.toLowerCase() === scope.toLowerCase());
  const scopeDativ = scopeKey ? SCOPE_TO_DATIVE[scopeKey] : null;
  const diffStrategic = getStrategicDifferentiatorPhrase(diff);

  const marketPhrase = scopeDativ
    ? `einem ${scopeDativ} Markt`
    : hasScope
      ? `dem ${scope}-Markt`
      : "";

  if (marketPhrase && hasTarget && diffStrategic) {
    return `Der strategische Schwerpunkt liegt auf ${marketPhrase} mit klarer Ausrichtung auf ${target} – differenziert durch ${diffStrategic}.`;
  }
  if (marketPhrase && hasTarget) {
    return `Der strategische Schwerpunkt liegt auf ${marketPhrase} mit klarer Ausrichtung auf ${target}.`;
  }
  if (marketPhrase && diffStrategic) {
    return `Der strategische Schwerpunkt liegt auf ${marketPhrase} – differenziert durch ${diffStrategic}.`;
  }
  if (hasTarget && diffStrategic) {
    return `Der strategische Schwerpunkt liegt auf ${target} – differenziert durch ${diffStrategic}.`;
  }
  if (marketPhrase) {
    return `Der strategische Schwerpunkt liegt auf ${marketPhrase}.`;
  }
  if (hasTarget) {
    return `Der strategische Schwerpunkt liegt auf einer klaren Ausrichtung auf ${target}.`;
  }
  if (diffStrategic) {
    return `Strategische Differenzierung durch ${diffStrategic}.`;
  }
  return "";
}

/** Marktbeschreibung: "Ein {phase-adjektiv}, {scope-adjektiv} Markt mit klarer Ausrichtung auf {target}." */
export function formatMarketDescription(
  marketScope: string,
  marketPhase: string,
  targetGroup: string
): string {
  const scope = marketScope?.trim() || "";
  const phase = marketPhase?.trim() || "";
  const target = targetGroup?.trim() || "";

  const scopeKey = Object.keys(SCOPE_TO_ADJECTIVE).find((k) => k.toLowerCase() === scope.toLowerCase());
  const scopeAdj = scopeKey ? SCOPE_TO_ADJECTIVE[scopeKey] : null;
  const phaseKey = Object.keys(PHASE_TO_ADJECTIVE).find((k) => k.toLowerCase() === phase.toLowerCase());
  const phaseAdj = phaseKey ? PHASE_TO_ADJECTIVE[phaseKey] : phase && phase !== "—" ? phase.toLowerCase() : "";
  const hasTarget = target && target !== "—";

  const scopePhraseKey = Object.keys(SCOPE_TO_PHRASE).find((k) => k.toLowerCase() === scope.toLowerCase());
  const isNische = scopePhraseKey && SCOPE_TO_PHRASE[scopePhraseKey] === "Nischenmarkt";
  const marketPhrase = (() => {
    if (phaseAdj && scopeAdj) {
      return `Ein ${phaseAdj}, ${scopeAdj} Markt`;
    }
    if (phaseAdj && isNische) {
      return `Ein ${phaseAdj} Nischenmarkt`;
    }
    if (phaseAdj) {
      return `Ein ${phaseAdj} Markt`;
    }
    if (scopeAdj) {
      return `Ein ${scopeAdj} Markt`;
    }
    if (isNische) {
      return "Ein Nischenmarkt";
    }
    if (scope && scope !== "—") {
      const fallback = scope.toLowerCase().replace(/\s/g, "");
      return `Ein ${fallback}er Markt`;
    }
    return "";
  })();

  if (marketPhrase && hasTarget) {
    return `${marketPhrase} mit klarer Ausrichtung auf ${target}.`;
  }
  if (marketPhrase) {
    return `${marketPhrase}.`;
  }
  if (hasTarget) {
    return `Klare Ausrichtung auf ${target}.`;
  }
  return "";
}

/** Scope → Nominativ (Ein regionaler Markt) */
const SCOPE_TO_ADJECTIVE: Record<string, string> = {
  Regional: "regionaler",
  National: "nationaler",
  International: "internationaler",
  Global: "globaler",
};

/** Scope → Dativ (auf einem regionalen Markt) */
const SCOPE_TO_DATIVE: Record<string, string> = {
  Regional: "regionalen",
  National: "nationalen",
  International: "internationalen",
  Global: "globalen",
  Nische: "nischenorientierten",
};

const SCOPE_TO_PHRASE: Record<string, string> = {
  Regional: "Regionaler",
  National: "Nationaler",
  International: "Internationaler",
  Global: "Globaler",
  Nische: "Nischenmarkt",
};

/** Phase → Nominativ (reifer Markt) */
const PHASE_TO_ADJECTIVE: Record<string, string> = {
  "Markt reif": "reifer",
  "Wachsender Markt": "wachsender",
  "Markt entsteht": "entstehender",
  "Markt schrumpft": "schrumpfender",
};

/** Phase → Dativ (auf einem reifen Markt) */
const PHASE_TO_DATIVE: Record<string, string> = {
  "Markt reif": "reifen",
  "Wachsender Markt": "wachsenden",
  "Markt entsteht": "entstehenden",
  "Markt schrumpft": "schrumpfenden",
};

/** Strategic Language Map: Differenzierer → Executive-Level Formulierung (für "differenziert durch X") */
const DIFFERENTIATOR_STRATEGIC_MAP: Record<string, string> = {
  Qualität: "konsequenten Qualitätsanspruch",
  "Individuelle Anpassungen an Kundenbedarf": "maßgeschneiderte Lösungen",
  Kundenservice: "außergewöhnlichen Kundenservice",
  Preis: "überzeugendes Preis-Leistungs-Verhältnis",
  Innovation: "nachhaltige Innovationskraft",
  Marke: "starke Markenpositionierung",
  Geschwindigkeit: "schnelle Umsetzungsstärke",
  Fachwissen: "klare fachliche Spezialisierung",
  "Software / SaaS": "zielgerichtete Digitalisierung",
};

function getStrategicDifferentiatorPhrase(diff: string): string {
  if (!diff || diff === "—") return "";
  const trimmed = diff.trim();
  const exact = DIFFERENTIATOR_STRATEGIC_MAP[trimmed];
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  if (lower.includes("qualität")) return "konsequenten Qualitätsanspruch";
  if (lower.includes("spezialis") || lower.includes("fachwissen") || lower.includes("expertise"))
    return "klare fachliche Spezialisierung";
  if (lower.includes("preis") || lower.includes("leistung")) return "überzeugendes Preis-Leistungs-Verhältnis";
  if (lower.includes("digital")) return "zielgerichtete Digitalisierung";
  return trimmed;
}

/** Strategische Leitlinie: Executive-Level, verstärkte Verben (konsequent/gezielt/nachhaltig) */
export function formatStrategicGuideline(direction: string): string {
  if (!direction || typeof direction !== "string") return "";
  let s = direction.trim();
  if (!s) return "";

  // "X durch Y stärken" → "Die X wird gezielt durch Y ausgebaut."
  s = s.replace(
    /^(.+?)\s+durch\s+(.+?)\s+stärken\.?$/i,
    (_, subj, means) => `Die ${subj.trim()} wird gezielt durch ${means.trim()} ausgebaut.`
  );

  // "X durch Y ausbauen" → "Die X wird gezielt durch Y ausgebaut."
  if (!s.includes("wird") && /ausbauen\.?$/i.test(s)) {
    s = s.replace(
      /^(.+?)\s+durch\s+(.+?)\s+ausbauen\.?$/i,
      (_, subj, means) => `Die ${subj.trim()} wird gezielt durch ${means.trim()} ausgebaut.`
    );
  }

  // "X stärken" (ohne "durch") → "Die X wird konsequent gestärkt."
  if (/stärken\.?$/i.test(s) && !s.includes("durch") && !s.includes("wird")) {
    s = s.replace(/\s+stärken\.?$/i, " wird konsequent gestärkt.");
    if (!/^[Dd]ie\s/.test(s)) {
      s = "Die " + s.charAt(0).toLowerCase() + s.slice(1);
    }
  }

  // "X ausbauen" (ohne "durch") → "Die X wird gezielt ausgebaut."
  if (/ausbauen\.?$/i.test(s) && !s.includes("durch") && !s.includes("wird")) {
    s = s.replace(/\s+ausbauen\.?$/i, " wird gezielt ausgebaut.");
    if (!/^[Dd]ie\s/.test(s)) {
      s = "Die " + s.charAt(0).toLowerCase() + s.slice(1);
    }
  }

  // "X verbessern" → "Die X wird nachhaltig optimiert."
  if (/verbessern\.?$/i.test(s) && !s.includes("wird")) {
    s = s.replace(/\s+verbessern\.?$/i, " wird nachhaltig optimiert.");
    if (!/^[Dd]ie\s/.test(s)) {
      s = "Die " + s.charAt(0).toLowerCase() + s.slice(1);
    }
  }

  return s.trim();
}

export interface StrategicFocusResult {
  focusSentence: string;
  keyPoints: {
    direction?: string;
    market?: string;
    differentiator?: string;
  };
}

function getNested(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

/** Derive strategic focus from profile. Only uses existing fields. No hallucination. */
export function deriveStrategicFocus(
  profile: StrategyProfileData
): StrategicFocusResult | null {
  const summary = profile.summary as Record<string, unknown> | undefined;
  const inputsEcho = profile.inputs_echo as Record<string, unknown> | undefined;
  const market = profile.market as Record<string, unknown> | undefined;
  const targetGroup = profile.target_group as Record<string, unknown> | undefined;
  const competition = profile.competition as Record<string, unknown> | undefined;

  const marketStage = String(market?.stage ?? "").trim();
  const geoMarket = String(inputsEcho?.geo_market ?? "").trim();
  const offerScope = String(inputsEcho?.offer_scope ?? "").trim();
  const primaryLabel = String(targetGroup?.primary_label ?? "").trim();
  const recommendedDirection = String(summary?.recommended_direction ?? "").trim();
  const differentiationLevers = (competition?.differentiation_levers as
    | string[]
    | undefined) ?? [];
  const topDifferentiator = differentiationLevers[0];
  const topDiffDisplay =
    topDifferentiator && typeof topDifferentiator === "string"
      ? getDisplayLabel("differentiator", topDifferentiator)
      : "";

  const marketPhaseLabel = marketStage
    ? getDisplayLabel("market_stage", marketStage)
    : "";
  const marketScopeLabel = geoMarket
    ? getDisplayLabel("market_scope", geoMarket)
    : offerScope
      ? getDisplayLabel("offer_scope", offerScope)
      : "";
  const targetLabel = primaryLabel
    ? getDisplayLabel("target_group", primaryLabel)
    : "";

  const focusSentence = formatFocusSentence(
    marketScopeLabel,
    targetLabel,
    topDiffDisplay
  );
  const marketFormatted = formatMarketDescription(
    marketScopeLabel,
    marketPhaseLabel,
    targetLabel
  );
  const directionFormatted = formatStrategicGuideline(recommendedDirection);

  const keyPoints: StrategicFocusResult["keyPoints"] = {};
  if (directionFormatted) keyPoints.direction = directionFormatted;
  if (marketFormatted) keyPoints.market = marketFormatted;
  const diffStrategic = getStrategicDifferentiatorPhrase(topDiffDisplay);
  if (diffStrategic) keyPoints.differentiator = diffStrategic;

  const hasAnyKeyPoint =
    keyPoints.direction || keyPoints.market || keyPoints.differentiator;
  if (!focusSentence && !hasAnyKeyPoint) return null;

  return { focusSentence, keyPoints };
}

/** Get tooltip for a field; fallback to generic if unknown */
export function getTooltip(fieldKey: string): TooltipContent {
  const t = TOOLTIP_DICTIONARY[fieldKey];
  if (t) return t;
  return {
    meaning: "Wichtiger Wert dieses Strategieprofils.",
    whyImportant: "Trägt zur Gesamtstrategie bei.",
    implication: "Berücksichtige ihn bei deinen Entscheidungen.",
    nextStep:
      "Diese Einordnung wirkt sich auf die Gesamtstrategie aus. Daraus ergibt sich die Relevanz dieses Aspekts in der weiteren Planung.",
  };
}
