/**
 * Stub data for Phase 5 artifacts - schema-compatible JSON per phase5.artifacts.json.
 * No OpenAI calls; used for validation and persistence.
 */

type Pillar = {
  id: string;
  title: string;
  core_messages: string[];
  cta: string;
};

type EditorialItem = {
  id: string;
  channel: string;
  format: string;
  pillar_id: string;
  hook: string;
  goal: string;
};

type GenerateAction = {
  action_id: "generate_post" | "generate_script" | "generate_outline" | "generate_hooks";
  label: string;
};

type Briefing = {
  id: string;
  title: string;
  channel: string;
  format: string;
  objective: string;
  target_audience_hint: string;
  key_points: string[];
  cta: string;
  generate_actions: GenerateAction[];
};

type EditorialBoard4w = {
  week_1: EditorialItem[];
  week_2: EditorialItem[];
  week_3: EditorialItem[];
  week_4: EditorialItem[];
};

type ContentPlan = {
  pillars: Pillar[];
  editorial_board_4w: EditorialBoard4w;
  briefings: Briefing[];
};

function createDefaultPillars(): Pillar[] {
  return [
    {
      id: "p1",
      title: "Expertise & Know-how",
      core_messages: ["Stub Kernbotschaft 1", "Stub Kernbotschaft 2"],
      cta: "Mehr erfahren",
    },
    {
      id: "p2",
      title: "Praxis & Anwendung",
      core_messages: ["Stub Praxis 1", "Stub Praxis 2"],
      cta: "Jetzt starten",
    },
  ];
}

function createDefaultEditorialItem(
  id: string,
  channel: string,
  format: string,
  pillarId: string,
  week: number
): EditorialItem {
  return {
    id,
    channel,
    format,
    pillar_id: pillarId,
    hook: `Stub Hook W${week}`,
    goal: "Sichtbarkeit",
  };
}

function createDefaultBriefing(id: string, title: string, channel: string, format: string): Briefing {
  return {
    id,
    title,
    channel,
    format,
    objective: "Stub Ziel",
    target_audience_hint: "Zielgruppe",
    key_points: ["Stub Point 1", "Stub Point 2"],
    cta: "Stub CTA",
    generate_actions: [
      { action_id: "generate_post", label: "Post generieren" },
      { action_id: "generate_outline", label: "Outline generieren" },
    ],
  };
}

/** content_plan_draft stub - schema-compatible */
export function createDraftContentPlan(
  _strategyProfile?: unknown,
  _strategicGuidelines?: unknown,
  _positioningAndBrandCore?: unknown,
  _marketingPlan?: unknown
): ContentPlan {
  const pillars = createDefaultPillars();
  const editorial_board_4w: EditorialBoard4w = {
    week_1: [
      createDefaultEditorialItem("e1", "LinkedIn", "Post", "p1", 1),
      createDefaultEditorialItem("e2", "Blog", "Artikel", "p2", 1),
    ],
    week_2: [
      createDefaultEditorialItem("e3", "LinkedIn", "Post", "p2", 2),
      createDefaultEditorialItem("e4", "Newsletter", "E-Mail", "p1", 2),
    ],
    week_3: [
      createDefaultEditorialItem("e5", "LinkedIn", "Carousel", "p1", 3),
    ],
    week_4: [
      createDefaultEditorialItem("e6", "Blog", "Artikel", "p2", 4),
    ],
  };
  const briefings: Briefing[] = [
    createDefaultBriefing("b1", "Stub Briefing 1", "LinkedIn", "Post"),
    createDefaultBriefing("b2", "Stub Briefing 2", "Blog", "Artikel"),
    createDefaultBriefing("b3", "Stub Briefing 3", "Newsletter", "E-Mail"),
  ];

  return {
    pillars,
    editorial_board_4w,
    briefings,
  };
}

/** content_plan from draft + answers - schema-compatible */
export function createFinalContentPlanFromDraft(
  draft: ContentPlan,
  _answersPhase5?: Record<string, unknown>
): ContentPlan {
  return {
    pillars: [...draft.pillars],
    editorial_board_4w: { ...draft.editorial_board_4w },
    briefings: draft.briefings.map((b) => ({
      ...b,
      generate_actions: [
        { action_id: "generate_post" as const, label: "Post generieren" },
        { action_id: "generate_script" as const, label: "Script generieren" },
        { action_id: "generate_outline" as const, label: "Outline generieren" },
        { action_id: "generate_hooks" as const, label: "Hooks generieren" },
      ].slice(0, 3),
    })),
  };
}

/** Simplified content_plan - fewer pillars, fewer briefings */
export function simplifyFinalContentPlan(existing: ContentPlan): ContentPlan {
  return {
    pillars: existing.pillars.slice(0, 2),
    editorial_board_4w: {
      week_1: existing.editorial_board_4w.week_1.slice(0, 2),
      week_2: existing.editorial_board_4w.week_2.slice(0, 2),
      week_3: existing.editorial_board_4w.week_3.slice(0, 2),
      week_4: existing.editorial_board_4w.week_4.slice(0, 2),
    },
    briefings: existing.briefings.slice(0, 6),
  };
}

/** Minimal content_plan - 1 pillar, 4–6 briefings total */
export function forceMinimalFinalContentPlan(_existing?: ContentPlan): ContentPlan {
  const pillars: Pillar[] = [
    {
      id: "min1",
      title: "Fokus-Säule",
      core_messages: ["Minimal: Eine Kernbotschaft"],
      cta: "Mehr erfahren",
    },
  ];
  const editorial_board_4w: EditorialBoard4w = {
    week_1: [
      createDefaultEditorialItem("me1", "LinkedIn", "Post", "min1", 1),
      createDefaultEditorialItem("me2", "Blog", "Artikel", "min1", 1),
    ],
    week_2: [
      createDefaultEditorialItem("me3", "LinkedIn", "Post", "min1", 2),
    ],
    week_3: [
      createDefaultEditorialItem("me4", "Newsletter", "E-Mail", "min1", 3),
    ],
    week_4: [
      createDefaultEditorialItem("me5", "LinkedIn", "Post", "min1", 4),
    ],
  };
  const briefings: Briefing[] = [
    createDefaultBriefing("mb1", "Minimal Briefing 1", "LinkedIn", "Post"),
    createDefaultBriefing("mb2", "Minimal Briefing 2", "Blog", "Artikel"),
    createDefaultBriefing("mb3", "Minimal Briefing 3", "Newsletter", "E-Mail"),
    createDefaultBriefing("mb4", "Minimal Briefing 4", "LinkedIn", "Post"),
    createDefaultBriefing("mb5", "Minimal Briefing 5", "LinkedIn", "Carousel"),
    createDefaultBriefing("mb6", "Minimal Briefing 6", "Blog", "Artikel"),
  ];

  return {
    pillars,
    editorial_board_4w,
    briefings,
  };
}

/** Regenerate stub - apply area/notes adjustments */
export function createRegeneratedContentPlanStub(
  existing: ContentPlan,
  _area: string[],
  _notes: string
): ContentPlan {
  return createFinalContentPlanFromDraft(existing, {
    area: _area,
    notes: _notes,
  });
}
