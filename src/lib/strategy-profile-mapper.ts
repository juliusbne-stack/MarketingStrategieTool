/**
 * Maps raw strategy_profile artifact data to display format.
 * No hallucination: only uses fields present in StrategyProfileSchema.
 * @see src/lib/validations/phase1-artifacts.ts
 */

import { getDisplayLabel } from "./strategy-profile-display";

export type StrategyProfileData = Record<string, unknown>;

export interface WhereToPlayItem {
  label: string;
  value: string;
  /** Raw value before display mapping (for clarity dot) */
  rawValue?: string;
  fieldKey: string;
  icon: "globe" | "target" | "users" | "package" | "layers";
}

export interface HowToWinItem {
  label: string;
  value: string;
  /** Raw value before display mapping (for clarity dot) */
  rawValue?: string;
  fieldKey: string;
  icon: "trending-up" | "award" | "compass" | "shield";
}

/** Cluster of items for grouped display */
export interface WhereToPlayCluster {
  title: string;
  items: WhereToPlayItem[];
}

export interface HowToWinCluster {
  title: string;
  items: HowToWinItem[];
}

export interface StrategyProfileMapped {
  /** Primary statement (1–2 sentences) */
  statementText: string;
  /** Key takeaways (max 3 bullets from available data) */
  keyTakeaways: string[];
  /** Where to play: 3 clusters */
  whereToPlayClusters: WhereToPlayCluster[];
  /** How to win: 3 clusters */
  howToWinClusters: HowToWinCluster[];
  /** Legacy flat lists (backward compat) */
  whereToPlayItems: WhereToPlayItem[];
  howToWinItems: HowToWinItem[];
  /** Confidence 0–100 based on field completeness */
  confidencePercent: number;
}

const RELEVANT_FIELDS = [
  "summary.one_liner",
  "summary.market_pressure",
  "summary.recommended_direction",
  "inputs_echo.offer_scope",
  "inputs_echo.geo_market",
  "inputs_echo.offer_type",
  "inputs_echo.buyer_type",
  "inputs_echo.budget_band",
  "market.stage",
  "market.attractiveness",
  "market.key_trends",
  "target_group.primary_label",
  "target_group.needs",
  "target_group.buying_triggers",
  "target_group.objections",
  "competition.intensity",
  "competition.competitor_names",
  "competition.differentiation_levers",
  "risks",
  "opportunities",
] as const;

function getNested(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

function isFilled(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/** Compute confidence from filled field count */
export function computeConfidence(data: StrategyProfileData): number {
  let filled = 0;
  for (const path of RELEVANT_FIELDS) {
    const val = getNested(data, path);
    if (isFilled(val)) filled++;
  }
  return Math.round((filled / RELEVANT_FIELDS.length) * 100);
}

/** Map strategy_profile artifact to display format */
export function mapStrategyProfile(data: StrategyProfileData): StrategyProfileMapped {
  const summary = data.summary as Record<string, unknown> | undefined;
  const inputsEcho = data.inputs_echo as Record<string, unknown> | undefined;
  const market = data.market as Record<string, unknown> | undefined;
  const targetGroup = data.target_group as Record<string, unknown> | undefined;
  const competition = data.competition as Record<string, unknown> | undefined;
  const risks = (data.risks as string[] | undefined) ?? [];
  const opportunities = (data.opportunities as string[] | undefined) ?? [];

  const oneLiner = String(summary?.one_liner ?? "").trim() || "—";
  const recommendedDirection = String(summary?.recommended_direction ?? "").trim();
  const marketPressure = String(summary?.market_pressure ?? "").trim();
  const keyTrends = (market?.key_trends as string[] | undefined) ?? [];
  const differentiationLevers = (competition?.differentiation_levers as string[] | undefined) ?? [];

  // Key takeaways: max 3 bullets, from available data (exclude one_liner as it's the statement)
  const keyTakeaways: string[] = [];
  if (recommendedDirection) keyTakeaways.push(recommendedDirection);
  if (keyTrends[0]) keyTakeaways.push(keyTrends[0]);
  if (differentiationLevers[0] && keyTakeaways.length < 3) keyTakeaways.push(differentiationLevers[0]);
  if (opportunities[0] && keyTakeaways.length < 3) keyTakeaways.push(opportunities[0]);
  if (keyTrends[1] && keyTakeaways.length < 3) keyTakeaways.push(keyTrends[1]);
  const takeaways = keyTakeaways.slice(0, 3);

  // Where to play
  const whereToPlayItems: WhereToPlayItem[] = [];
  const geo = String(inputsEcho?.geo_market ?? "").trim();
  if (geo) whereToPlayItems.push({ label: "Markt", value: getDisplayLabel("market_scope", geo), rawValue: geo, fieldKey: "market_scope", icon: "globe" });
  const stage = String(market?.stage ?? "").trim();
  if (stage) whereToPlayItems.push({ label: "Marktphase", value: getDisplayLabel("market_stage", stage), rawValue: stage, fieldKey: "market_stage", icon: "layers" });
  const buyer = String(inputsEcho?.buyer_type ?? "").trim();
  if (buyer) whereToPlayItems.push({ label: "Käufertyp", value: getDisplayLabel("buyer_type", buyer), rawValue: buyer, fieldKey: "buyer_type", icon: "users" });
  const offerType = String(inputsEcho?.offer_type ?? "").trim();
  if (offerType) whereToPlayItems.push({ label: "Angebotstyp", value: getDisplayLabel("offer_type", offerType), rawValue: offerType, fieldKey: "offer_type", icon: "package" });
  const offerScope = String(inputsEcho?.offer_scope ?? "").trim();
  if (offerScope) whereToPlayItems.push({ label: "Angebotsumfang", value: getDisplayLabel("offer_scope", offerScope), rawValue: offerScope, fieldKey: "offer_scope", icon: "target" });
  const primaryLabel = String(targetGroup?.primary_label ?? "").trim();
  if (primaryLabel) whereToPlayItems.push({ label: "Zielgruppe", value: getDisplayLabel("target_group", primaryLabel), rawValue: primaryLabel, fieldKey: "target_group", icon: "target" });

  // Where to play: 3 clusters
  const whereToPlayClusters: WhereToPlayCluster[] = [
    {
      title: "Markt & Reichweite",
      items: whereToPlayItems.filter((i) => ["market_scope", "market_stage"].includes(i.fieldKey)),
    },
    {
      title: "Für wen",
      items: whereToPlayItems.filter((i) => ["target_group", "buyer_type"].includes(i.fieldKey)),
    },
    {
      title: "Angebot",
      items: whereToPlayItems.filter((i) => ["offer_type", "offer_scope"].includes(i.fieldKey)),
    },
  ].filter((c) => c.items.length > 0);

  // How to win
  const howToWinItems: HowToWinItem[] = [];
  if (recommendedDirection) howToWinItems.push({ label: "Strategische Richtung", value: recommendedDirection, rawValue: recommendedDirection, fieldKey: "strategic_direction", icon: "compass" });
  differentiationLevers.slice(0, 3).forEach((v) => {
    if (v && typeof v === "string") howToWinItems.push({ label: "Differenzierung", value: getDisplayLabel("differentiator", v), rawValue: v, fieldKey: "differentiator", icon: "award" });
  });
  const intensity = String(competition?.intensity ?? "").trim();
  if (intensity) howToWinItems.push({ label: "Wettbewerb", value: getDisplayLabel("intensity", intensity), rawValue: intensity, fieldKey: "competition_intensity", icon: "shield" });
  const attractiveness = String(market?.attractiveness ?? "").trim();
  if (attractiveness) howToWinItems.push({ label: "Marktattraktivität", value: getDisplayLabel("attractiveness", attractiveness), rawValue: attractiveness, fieldKey: "market_attractiveness", icon: "trending-up" });

  // How to win: 3 clusters
  const howToWinClusters: HowToWinCluster[] = [
    {
      title: "Leitlinie",
      items: howToWinItems.filter((i) => i.fieldKey === "strategic_direction"),
    },
    {
      title: "Warum Kunden dich wählen",
      items: howToWinItems.filter((i) => i.fieldKey === "differentiator"),
    },
    {
      title: "Marktbedingungen",
      items: howToWinItems.filter((i) => ["competition_intensity", "market_attractiveness"].includes(i.fieldKey)),
    },
  ].filter((c) => c.items.length > 0);

  const confidencePercent = computeConfidence(data);

  return {
    statementText: oneLiner,
    keyTakeaways: takeaways,
    whereToPlayClusters,
    howToWinClusters,
    whereToPlayItems,
    howToWinItems,
    confidencePercent,
  };
}
