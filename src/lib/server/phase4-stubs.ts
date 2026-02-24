/**
 * Stub data for Phase 4 artifacts - schema-compatible JSON per phase4.artifacts.json.
 * No OpenAI calls; used for validation and persistence.
 */

const MIX_RADAR_DIMENSIONS = [
  { dimension: "content" as const, label: "Content Marketing", score: 0 },
  { dimension: "community" as const, label: "Community", score: 0 },
  { dimension: "performance_ads" as const, label: "Performance Ads", score: 0 },
  { dimension: "seo" as const, label: "SEO", score: 0 },
  { dimension: "email_crm" as const, label: "E-Mail & CRM", score: 0 },
  { dimension: "partnerships" as const, label: "Partnerschaften", score: 0 },
] as const;

type MixRadarItem = {
  dimension: string;
  label: string;
  score: number;
};

type DraftMeasureItem = {
  id: string;
  name: string;
  goal: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
};

type FinalMeasureItem = DraftMeasureItem & {
  owner: "self" | "mixed" | "external" | "unclear";
};

type ChannelItem = {
  channel_id: string;
  label: string;
  weight: number;
  role: "primary" | "secondary" | "supporting";
};

type ChannelItemWithWhy = ChannelItem & {
  why: string;
};

type MixCardItem = {
  dimension: string;
  label: string;
  focus_reason: string;
  quick_win: string;
};

function createMixRadarStub(scores?: number[]): MixRadarItem[] {
  return MIX_RADAR_DIMENSIONS.map((d, i) => ({
    dimension: d.dimension,
    label: d.label,
    score: scores?.[i] ?? 50,
  }));
}

function createDraftMeasureItem(
  id: string,
  name: string,
  goal: string,
  effort: DraftMeasureItem["effort"],
  impact: DraftMeasureItem["impact"]
): DraftMeasureItem {
  return { id, name, goal, effort, impact };
}

function createFinalMeasureItem(
  item: DraftMeasureItem,
  owner: FinalMeasureItem["owner"] = "self"
): FinalMeasureItem {
  return { ...item, owner };
}

/** marketing_plan_draft stub - schema-compatible, no owner in measure_item */
export function createMarketingPlanDraftStub(
  _answers?: Record<string, unknown>
): Record<string, unknown> {
  const mixRadar = createMixRadarStub([70, 40, 30, 80, 60, 20]);

  const channels = {
    stack: [
      { channel_id: "content", label: "Content & Blog", weight: 80, role: "primary" as const },
      { channel_id: "linkedin", label: "LinkedIn", weight: 60, role: "primary" as const },
      { channel_id: "seo", label: "SEO", weight: 70, role: "secondary" as const },
      { channel_id: "email", label: "E-Mail", weight: 50, role: "supporting" as const },
    ] as ChannelItem[],
  };

  const measures = {
    kanban: {
      now: [
        createDraftMeasureItem("m1", "Blog starten", "Sichtbarkeit", "medium", "high"),
        createDraftMeasureItem("m2", "LinkedIn Profil optimieren", "Reichweite", "low", "medium"),
      ],
      next: [
        createDraftMeasureItem("m3", "Newsletter aufsetzen", "Leads", "medium", "high"),
        createDraftMeasureItem("m4", "Case Studies", "Vertrauen", "high", "high"),
      ],
      later: [
        createDraftMeasureItem("m5", "Webinar", "Leads", "high", "high"),
        createDraftMeasureItem("m6", "Partner-Kooperation", "Reichweite", "medium", "medium"),
      ],
    },
  };

  const constraints = {
    time_per_week_band: "2_5" as const,
    complexity_level: "balanced" as const,
    budget_band: "low" as const,
  };

  return {
    mix_radar: mixRadar,
    channels,
    measures,
    constraints,
  };
}

/** marketing_plan stub - schema-compatible, with mix_cards, owner, rules_of_engagement */
export function createMarketingPlanStub(
  draft: Record<string, unknown>,
  _answersPhase4?: Record<string, unknown>
): Record<string, unknown> {
  const mixRadar = (draft.mix_radar as MixRadarItem[]) ?? createMixRadarStub();
  const channelsStack = (draft.channels as { stack: ChannelItem[] })?.stack ?? [];
  const draftMeasures = (draft.measures as { kanban: { now: DraftMeasureItem[]; next: DraftMeasureItem[]; later: DraftMeasureItem[] } })?.kanban ?? { now: [], next: [], later: [] };
  const draftConstraints = (draft.constraints as { time_per_week_band: string; complexity_level: string; budget_band: string }) ?? { time_per_week_band: "2_5", complexity_level: "balanced", budget_band: "low" };

  const mixCards: MixCardItem[] = mixRadar.slice(0, 6).map((r) => ({
    dimension: r.dimension,
    label: r.label,
    focus_reason: `Stub Fokus für ${r.label}`,
    quick_win: `Stub Quick Win für ${r.label}`,
  }));

  const channels = {
    stack: channelsStack.map((c) => ({
      ...c,
      why: `Stub Begründung für ${c.label}`,
    })) as ChannelItemWithWhy[],
    notes: "Stub Kanäle-Notizen basierend auf Phase-4-Antworten.",
  };

  const addOwner = (items: DraftMeasureItem[]): FinalMeasureItem[] =>
    items.map((i) => createFinalMeasureItem(i, "self"));

  const measures = {
    kanban: {
      now: addOwner(draftMeasures.now ?? []),
      next: addOwner(draftMeasures.next ?? []),
      later: addOwner(draftMeasures.later ?? []),
    },
    rules_of_engagement: [
      "Stub Regel 1: Konsistenz",
      "Stub Regel 2: Qualität vor Quantität",
      "Stub Regel 3: Messen & anpassen",
    ],
  };

  const constraints = draftConstraints;

  return {
    mix_radar: mixRadar,
    mix_cards: mixCards,
    channels,
    measures,
    constraints,
  };
}

/** Simplified marketing_plan - fewer channels, fewer measures */
export function createSimplifiedMarketingPlanStub(
  existing: Record<string, unknown>
): Record<string, unknown> {
  const plan = createMarketingPlanStub(existing);
  const stack = (plan.channels as { stack: ChannelItemWithWhy[] }).stack;
  const kanban = (plan.measures as { kanban: { now: FinalMeasureItem[]; next: FinalMeasureItem[]; later: FinalMeasureItem[] } }).kanban;

  const simplifiedChannels = {
    stack: stack.slice(0, 2).map((c) => ({ ...c, why: `Vereinfacht: ${c.why}` })),
    notes: "Vereinfachter Kanäle-Mix.",
  };

  const simplifiedMeasures = {
    kanban: {
      now: kanban.now.slice(0, 2),
      next: kanban.next.slice(0, 2),
      later: kanban.later.slice(0, 2),
    },
    rules_of_engagement: ["Fokus auf wenige, wirksame Maßnahmen."],
  };

  return {
    ...plan,
    channels: simplifiedChannels,
    measures: simplifiedMeasures,
  };
}

/** Minimal viable marketing_plan - 1-2 channels, ~3 measures total */
export function createMinimalMarketingPlanStub(
  _existing?: Record<string, unknown>
): Record<string, unknown> {
  const mixRadar = createMixRadarStub([60, 20, 10, 50, 40, 10]);

  const mixCards: MixCardItem[] = mixRadar.map((r) => ({
    dimension: r.dimension,
    label: r.label,
    focus_reason: "Minimaler Fokus",
    quick_win: "Minimaler Quick Win",
  }));

  const channels = {
    stack: [
      { channel_id: "content", label: "Content", weight: 80, role: "primary" as const, why: "Minimal: 1 Kanal" },
      { channel_id: "linkedin", label: "LinkedIn", weight: 50, role: "secondary" as const, why: "Minimal: 2. Kanal" },
    ] as ChannelItemWithWhy[],
    notes: "Minimal: 1–2 Kanäle fokussiert.",
  };

  const measures = {
    kanban: {
      now: [
        createFinalMeasureItem(createDraftMeasureItem("min1", "Blog 1x/Monat", "Sichtbarkeit", "low", "medium"), "self"),
        createFinalMeasureItem(createDraftMeasureItem("min2", "LinkedIn 2x/Woche", "Reichweite", "low", "medium"), "self"),
      ],
      next: [
        createFinalMeasureItem(createDraftMeasureItem("min3", "Newsletter", "Leads", "medium", "high"), "self"),
      ],
      later: [] as FinalMeasureItem[],
    },
    rules_of_engagement: ["Minimal: Weniger ist mehr."],
  };

  const constraints = {
    time_per_week_band: "lt_2" as const,
    complexity_level: "simple" as const,
    budget_band: "none" as const,
  };

  return {
    mix_radar: mixRadar,
    mix_cards: mixCards,
    channels,
    measures,
    constraints,
  };
}

/** Regenerate stub - apply area/notes adjustments */
export function createRegeneratedMarketingPlanStub(
  existing: Record<string, unknown>,
  _area: string,
  _notes: string
): Record<string, unknown> {
  return createMarketingPlanStub(existing, { area: _area, notes: _notes });
}
