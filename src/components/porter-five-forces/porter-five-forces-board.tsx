"use client";

import { useCallback, useState } from "react";

export type PorterForceKey =
  | "rivalry"
  | "new_entrants"
  | "substitutes"
  | "buyer_power"
  | "supplier_power";

/** Eintrittsbarriere mit Stärke und Begründung (für new_entrants) */
export type EntryBarrier = {
  name: string;
  strength: "Niedrig" | "Mittel" | "Hoch";
  rationale: string;
  /** Detaillierte Vertiefung beim Aufklappen – optional für Abwärtskompatibilität */
  details?: string;
};

/** Quelle aus der Web-Recherche */
export type PorterSource = {
  url: string;
  title?: string;
  publisher?: string;
  date?: string;
};

/** Unternehmen mit optionaler URL – nur mit url wird der Name klickbar */
export type EntityLink = { name: string; url?: string | null };

/** Detaillierte Analyse für "Bedrohung durch neue Marktteilnehmer" */
export type NewEntrantsDetailed = {
  stability_level: "Niedrig" | "Mittel" | "Hoch";
  short_summary: string;
  competition_impact: string;
  entry_barriers: EntryBarrier[];
  potential_new_entrants: string[];
  porter_interactions: string;
  early_indicators: string;
  strategic_implication: string;
};

/** Top-Substitut mit Relevanz und Begründung */
export type TopSubstitute = {
  name: string;
  relevanz: "Hoch" | "Mittel" | "Niedrig";
  why_attractive: string;
  examples?: string;
};

/** Detaillierte Analyse für "Bedrohung durch Ersatzangebote" */
export type SubstitutesDetailed = {
  stability_level: "Niedrig" | "Mittel" | "Hoch";
  short_summary: string;
  competition_impact: string;
  top_substitutes: TopSubstitute[];
  switch_triggers: string[];
  protection_factors: string[];
  porter_interactions: string;
  early_indicators: string;
  strategic_implication: string;
};

export type PorterForce = {
  key: PorterForceKey;
  label: string;
  pressure: number;
  insights: string[];
  market_actors?: string[];
  strategic_insight?: string;
  /** URLs der für diese Kraft genutzten Quellen */
  source_urls?: string[];
  /** Gefilterte Quellen für diese Kraft (aus source_urls) */
  sources?: PorterSource[];
  /** Unternehmen mit URL für klickbare Links – nur mit url klickbar */
  entity_links?: EntityLink[];
  detailed_analysis?: NewEntrantsDetailed | SubstitutesDetailed;
};

/** Reine Blautöne – von oben (dunkelste) nach unten (hellste) */
const FORCE_COLORS_BY_INDEX = [
  "#0a1628", // oberste Karte: am dunkelsten
  "#0f2847",
  "#1e3a5f",
  "#1e4976",
  "#2563eb", // unterste Karte: am hellsten
];

function pressureLabel(pressure: number): string {
  if (pressure <= 30) return "Niedrig";
  if (pressure <= 60) return "Mittel";
  return "Hoch";
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 2).trim() + "…";
}

interface PorterFiveForcesBoardProps {
  forces: PorterForce[];
  selectedForce?: PorterForce | null;
  onForceClick: (force: PorterForce) => void;
}

export function PorterFiveForcesBoard({
  forces,
  selectedForce = null,
  onForceClick,
}: PorterFiveForcesBoardProps) {
  const [hoveredKey, setHoveredKey] = useState<PorterForceKey | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, force: PorterForce) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onForceClick(force);
      }
    },
    [onForceClick]
  );

  if (forces.length === 0) return null;

  return (
    <div className="porter-board relative w-full flex-1 min-h-0 flex flex-col items-stretch">
      <style>{`
        .porter-board [role="button"]:focus { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
        .porter-pill { transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, filter 0.15s ease-out; border: none; }
        .porter-pill:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); filter: brightness(1.04); }
        .porter-card-stack {
          outline: none;
          border: none;
        }
        .porter-card-divider {
          border: none;
        }
      `}</style>
      <div
        className="porter-card-stack flex flex-1 min-h-0 w-full overflow-hidden rounded-l-xl"
        role="list"
        aria-label="Porter Fünf Kräfte"
      >
        {/* Vertikale Verbindungslinie – verläuft in Hintergrundfarbe unten */}
        <div
          className="w-1 flex-shrink-0 rounded-bl-xl"
          style={{
            background: "linear-gradient(to bottom, rgb(30 58 95 / 0.9), rgb(30 58 95 / 0.5) 60%, var(--background))",
          }}
          aria-hidden
        />
        <div className="flex flex-1 min-h-0 flex-col">
        {forces.map((force, index) => {
          const isActive =
            selectedForce?.key === force.key || hoveredKey === force.key;
          const color = FORCE_COLORS_BY_INDEX[index] ?? FORCE_COLORS_BY_INDEX[0];
          const insight =
            force.insights?.[0] ?? force.strategic_insight ?? null;
          const actors = force.market_actors?.slice(0, 2) ?? [];
          const isFirst = index === 0;
          const isLast = index === forces.length - 1;

          return (
            <button
              key={force.key}
              type="button"
              role="listitem"
              className={`
                porter-pill porter-card-divider flex flex-1 min-h-0 flex-col justify-center w-full text-left pl-6 pr-6 py-4
                font-semibold
                ${isFirst ? "rounded-t-xl" : ""}
                ${isLast ? "rounded-b-xl" : ""}
                ${isActive ? "ring-2 ring-inset ring-blue-300/50" : ""}
              `}
              style={{
                background: `linear-gradient(to right, ${color} 55%, var(--background))`,
                color: "white",
              }}
              aria-label={`${force.label}. Druck: ${pressureLabel(force.pressure)}. Details anzeigen`}
              onClick={() => onForceClick(force)}
              onKeyDown={(e) => handleKeyDown(e, force)}
              onMouseEnter={() => setHoveredKey(force.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Überschrift – gleiche Größe wie Umfeld-Insights (text-base) */}
              <div className="text-base font-semibold leading-snug mb-1">
                {force.label}
              </div>
              {/* Druck + Kernaussage (kompakt) */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-normal opacity-95">
                <span className="shrink-0 text-xs">
                  {pressureLabel(force.pressure)} ({force.pressure})
                </span>
                {insight && (
                  <>
                    <span className="shrink-0 text-white/60">·</span>
                    <span className="min-w-0">
                      {truncate(insight, 85)}
                    </span>
                  </>
                )}
              </div>
              {actors.length > 0 && (
                <div className="mt-1 text-xs opacity-85">
                  {actors.join(", ")}
                </div>
              )}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
