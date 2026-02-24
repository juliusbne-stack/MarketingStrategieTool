"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ExternalDriver,
  ExternalDriversCategory,
} from "@/lib/server/external-drivers-types";

export type ClusterNode = {
  clusterKey: string;
  clusterTitle: string;
  drivers: ExternalDriver[];
  highConfidenceCount: number;
  hasFresh: boolean;
};

/** Data model for diagram nodes: id, label, category, importance (0–5), disabled */
export type DiagramNode = {
  id: string;
  label: string;
  category: PestelCategory;
  importance: number;
  disabled?: boolean;
  cluster: ClusterNode;
};

export type PestelCategory =
  | "technological"
  | "economic"
  | "political"
  | "sociocultural"
  | "ecological"
  | "legal";

interface PestelBoardProps {
  clusters: ClusterNode[];
  /** Company name for center label: "Externe Faktoren „Name"" or "Externe Faktoren" if empty */
  companyName?: string | null;
  /** Currently selected cluster (info panel open) – used for active state styling */
  selectedCluster?: ClusterNode | null;
  /** Enable subtle noise overlay (default true) */
  enableNoise?: boolean;
  onClusterClick: (cluster: ClusterNode) => void;
}

/** Semantic color mapping: category -> CSS variable (outlines/glows only) */
const PESTEL_COLORS: Record<PestelCategory, string> = {
  technological: "var(--pestel-technical)",
  economic: "var(--pestel-economic)",
  political: "var(--pestel-political)",
  sociocultural: "var(--pestel-sociocultural)",
  ecological: "var(--pestel-ecological)",
  legal: "var(--pestel-legal)",
};

/** PESTEL positions with base angles; layout adds jitter per node count */
const PESTEL_POSITIONS: Array<{
  id: PestelCategory;
  label: string;
  shortLabel: string;
  baseAngle: number;
}> = [
  { id: "legal", label: "Rechtliche Faktoren", shortLabel: "Rechtlich", baseAngle: 0 },
  { id: "political", label: "Politische Faktoren", shortLabel: "Politisch", baseAngle: 55 },
  { id: "economic", label: "Wirtschaftliche Faktoren", shortLabel: "Wirtschaftlich", baseAngle: 110 },
  { id: "sociocultural", label: "Soziokulturelle Faktoren", shortLabel: "Soziokulturell", baseAngle: 165 },
  { id: "technological", label: "Technische Faktoren", shortLabel: "Technisch", baseAngle: 250 },
  { id: "ecological", label: "Ökologisch-geographische Faktoren", shortLabel: "Ökologisch", baseAngle: 305 },
];

function normalizeToPestelId(id: string, title: string): PestelCategory {
  const lower = (id || title || "").toLowerCase();
  if (lower.includes("recht") || lower.includes("legal")) return "legal";
  if (lower.includes("polit") || lower.includes("policy")) return "political";
  if (lower.includes("wirtschaft") || lower.includes("economic") || lower.includes("ökonom")) return "economic";
  if (lower.includes("sozio") || lower.includes("kultur") || lower.includes("soci")) return "sociocultural";
  if (lower.includes("techn") || lower.includes("tech")) return "technological";
  if (lower.includes("ökolog") || lower.includes("ecolog") || lower.includes("geo") || lower.includes("umwelt")) return "ecological";
  return "economic";
}

function isDriverFresh(driver: ExternalDriver): boolean {
  const d = driver.freshestSourceDate;
  if (!d) return false;
  const daysAgo = Math.floor(
    (Date.now() - new Date(d).getTime()) / (24 * 60 * 60 * 1000)
  );
  return daysAgo <= 7;
}

/** Compute importance 0–5 from cluster: avg driver impact, or driver count as proxy */
function computeImportance(cluster: ClusterNode): number {
  const drivers = cluster.drivers;
  if (drivers.length === 0) return 3;
  const impacts = drivers
    .map((d) => d.impact ?? 3)
    .filter((n): n is 1 | 2 | 3 | 4 | 5 => typeof n === "number" && n >= 1 && n <= 5);
  if (impacts.length > 0) {
    const avg = impacts.reduce((a, b) => a + b, 0) / impacts.length;
    return Math.round(Math.min(5, Math.max(0, avg)));
  }
  // Proxy: scale driver count to 0–5 (1 driver=1, 2=2, 3+=3, 5+=4, 8+=5)
  const n = drivers.length;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 3;
  if (n <= 6) return 4;
  return 5;
}

/** Layout: compute orbital positions. Uses PESTEL base angles + small jitter for variety. */
function computeOrbitalLayout(
  nodes: Array<DiagramNode & { baseAngle: number }>,
  centerX: number,
  centerY: number,
  orbitRadius: number
): Array<DiagramNode & { x: number; y: number; angle: number }> {
  const jitter = (i: number) => ((i * 7) % 11) - 5;
  return nodes.map((node, i) => {
    const angle = node.baseAngle + jitter(i);
    const rad = (angle * Math.PI) / 180;
    const x = round2(centerX + orbitRadius * Math.sin(rad));
    const y = round2(centerY - orbitRadius * Math.cos(rad));
    return { ...node, x, y, angle };
  });
}

/** Round to 2 decimals to avoid server/client hydration mismatch from float precision */
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Node radius from importance (0–5): min 24, max 44 */
function radiusFromImportance(imp: number): number {
  const t = Math.max(0, Math.min(5, imp));
  return round2(24 + (t / 5) * 20);
}

/** Pill dimensions so text fits inside: width from label length, height from importance */
function pillDimensions(
  label: string,
  importance: number
): { w: number; h: number } {
  const charCount = label.length;
  const baseFontSize = 11 + Math.min(2, importance);
  const minW = 56;
  const minH = 28;
  const w = Math.max(minW, round2(charCount * baseFontSize * 0.6 + 16));
  const h = Math.max(minH, round2(baseFontSize * 2.2));
  return { w: Math.min(w, 140), h };
}

const VIEW_SIZE = 500;
const CENTER = VIEW_SIZE / 2;
/** Max radius for background grid – fills entire dashboard, fades toward edges */
const GRID_MAX_RADIUS = 1000;
const ORBIT_RADIUS_DEFAULT = 165;
const ORBIT_RADIUS_SPARSE = 190; // when <=3 nodes: ensures edge pills (e.g. Wirtschaftlich) fit in viewBox
const HUB_RADIUS_DEFAULT = 70;
const HUB_RADIUS_SPARSE = 84;

export function PestelBoard({
  clusters,
  companyName,
  selectedCluster = null,
  enableNoise = true,
  onClusterClick,
}: PestelBoardProps) {
  const selectedClusterKey = selectedCluster
    ? normalizeToPestelId(selectedCluster.clusterKey, selectedCluster.clusterTitle)
    : null;
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clustersByPestel = useMemo(() => {
    const map = new Map<string, ClusterNode>();
    for (const c of clusters) {
      const pestelId = normalizeToPestelId(c.clusterKey, c.clusterTitle);
      const existing = map.get(pestelId);
      if (!existing || c.drivers.length > existing.drivers.length) {
        map.set(pestelId, {
          ...c,
          clusterTitle: PESTEL_POSITIONS.find((p) => p.id === pestelId)?.label ?? c.clusterTitle,
        });
      } else {
        existing.drivers.push(...c.drivers);
        existing.highConfidenceCount += c.highConfidenceCount;
        if (c.hasFresh) existing.hasFresh = true;
      }
    }
    return map;
  }, [clusters]);

  const diagramNodes = useMemo(() => {
    return PESTEL_POSITIONS.filter((p) => clustersByPestel.has(p.id)).map(
      (p) => {
        const cluster = clustersByPestel.get(p.id)!;
        return {
          id: p.id,
          label: p.shortLabel,
          category: p.id,
          importance: computeImportance(cluster),
          disabled: false,
          cluster,
          baseAngle: p.baseAngle,
        };
      }
    );
  }, [clustersByPestel]);

  const nodeCount = diagramNodes.length;
  const useSparseScale = nodeCount <= 3;
  const orbitRadius = useSparseScale ? ORBIT_RADIUS_SPARSE : ORBIT_RADIUS_DEFAULT;
  const hubRadius = useSparseScale ? HUB_RADIUS_SPARSE : HUB_RADIUS_DEFAULT;

  const positionedNodes = useMemo(
    () => computeOrbitalLayout(diagramNodes, CENTER, CENTER, orbitRadius),
    [diagramNodes, orbitRadius]
  );

  /** Ghost nodes: missing PESTEL categories, same orbit layout */
  const ghostNodes = useMemo(() => {
    const occupied = new Set(diagramNodes.map((n) => n.id));
    return PESTEL_POSITIONS.filter((p) => !occupied.has(p.id)).map((p, i) => {
      const jitter = ((i * 7) % 11) - 5;
      const angle = p.baseAngle + jitter;
      const rad = (angle * Math.PI) / 180;
      return {
        id: p.id,
        label: p.shortLabel,
        category: p.id,
        x: round2(CENTER + orbitRadius * Math.sin(rad)),
        y: round2(CENTER - orbitRadius * Math.cos(rad)),
        angle,
      };
    });
  }, [diagramNodes, orbitRadius]);

  const hasSelection = !!selectedClusterKey;
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, node: DiagramNode) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClusterClick(node.cluster);
      }
    },
    [onClusterClick]
  );

  if (clusters.length === 0) return null;

  return (
    <div
      className={`pestel-board relative w-full max-w-2xl mx-auto flex items-center justify-center -mt-3 overflow-visible ${useSparseScale ? "min-h-[420px]" : ""}`}
    >
      <style>{`
        .pestel-board svg {
          --pestel-transition: 0.2s ease-out;
        }
        .pestel-node {
          cursor: pointer;
          transition: transform var(--pestel-transition);
        }
        .pestel-node:hover {
          transform: scale(1.04);
        }
        .pestel-node:focus {
          outline: none;
        }
        .pestel-node-active {
          transform: scale(1.02);
          animation: pestel-pulse 0.4s ease-out;
        }
        @keyframes pestel-pulse {
          0%, 100% { transform: scale(1.02); }
          50% { transform: scale(1.06); }
        }
        .pestel-edge {
          transition: stroke-width var(--pestel-transition), stroke-opacity var(--pestel-transition), opacity var(--pestel-transition);
        }
        .pestel-orbital-path {
          stroke-dasharray: 8 6;
          animation: pestel-draw-orbital 1.2s ease-out forwards;
        }
        @keyframes pestel-draw-orbital {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        .pestel-center {
          animation: pestel-fade-zoom 0.5s ease-out forwards;
        }
        @keyframes pestel-fade-zoom {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pestel-node-enter {
          animation: pestel-node-enter 0.4s ease-out forwards;
        }
        @keyframes pestel-node-enter {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .pestel-ghost {
          cursor: default;
          opacity: 0.3;
        }
        .pestel-ghost:hover {
          opacity: 0.4;
        }
      `}</style>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className={`w-full max-w-[600px] h-auto overflow-visible ${useSparseScale ? "min-h-[380px]" : ""}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="PESTEL-Diagramm: Externe Faktoren und Kategorien"
      >
        <defs>
          {/* Glow filter for active/hover node – soft light glow (SVG filters don't support dynamic colors) */}
          <filter id="pestel-node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feFlood floodColor="#94a3b8" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Center hub glow */}
          <filter id="pestel-center-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="#cbd5e1" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="pestel-bg-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.08" />
            <stop offset="50%" stopColor="white" stopOpacity="0.03" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {/* Mask: grid fades from center (opaque) to edges (transparent) – rect covers full grid extent */}
          <radialGradient id="pestel-grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="35%" stopColor="white" stopOpacity="0.5" />
            <stop offset="60%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="pestel-grid-mask">
            <rect
              x={CENTER - GRID_MAX_RADIUS}
              y={CENTER - GRID_MAX_RADIUS}
              width={GRID_MAX_RADIUS * 2}
              height={GRID_MAX_RADIUS * 2}
              fill="url(#pestel-grid-fade)"
            />
          </mask>
          {/* Noise overlay: feTurbulence for subtle texture */}
          <filter id="pestel-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.12 0" result="mono" />
          </filter>
        </defs>

        {/* Background: symmetric radar grid fills entire view, fades toward edges */}
        <g id="bg-context" opacity={mounted ? 1 : 0} style={{ transition: "opacity 0.4s ease" }}>
          <rect x={0} y={0} width={VIEW_SIZE} height={VIEW_SIZE} fill="url(#pestel-bg-vignette)" />
          {enableNoise && (
            <rect
              x={0}
              y={0}
              width={VIEW_SIZE}
              height={VIEW_SIZE}
              fill="white"
              filter="url(#pestel-noise)"
              style={{ opacity: 0.05 }}
            />
          )}
          {/* Radar grid: full background, masked to fade toward edges */}
          <g mask="url(#pestel-grid-mask)">
            {/* 20 concentric circles: fill entire dashboard with gradual fade */}
            {Array.from({ length: 20 }, (_, i) => i + 1).map((i) => (
              <circle
                key={`ring-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={round2((GRID_MAX_RADIUS * i) / 20)}
                fill="none"
                stroke="var(--diagram-bg-grid)"
                strokeWidth={0.5}
              />
            ))}
            {/* 24 radial lines at 15° intervals – full radius */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              const r = GRID_MAX_RADIUS;
              const x2 = round2(CENTER + r * Math.sin(a));
              const y2 = round2(CENTER - r * Math.cos(a));
              return (
                <line
                  key={`radial-${i}`}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x2}
                  y2={y2}
                  stroke="var(--diagram-bg-grid2)"
                  strokeWidth={0.5}
                />
              );
            })}
          </g>
        </g>

        {/* Dotted orbital path (main ring) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={orbitRadius}
          fill="none"
          stroke="var(--pestel-orbital-stroke)"
          strokeWidth="1"
          strokeDasharray="6 8"
          className={mounted ? "pestel-orbital-path" : ""}
          style={{ opacity: 0.5 }}
        />

        {/* Dashed edges: center to each node */}
        <g>
          {positionedNodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const innerX = round2(CENTER + hubRadius * Math.sin(rad));
            const innerY = round2(CENTER - hubRadius * Math.cos(rad));
            const isActive =
              node.id === selectedClusterKey ||
              node.id === hoveredId ||
              node.id === focusedId;
            const isDimmed = hasSelection && !isActive && selectedClusterKey !== node.id;
            return (
              <line
                key={`edge-${node.id}`}
                x1={innerX}
                y1={innerY}
                x2={round2(node.x)}
                y2={round2(node.y)}
                stroke="var(--pestel-edge-default)"
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray="5 4"
                className="pestel-edge"
                style={{
                  stroke: isActive ? "var(--pestel-edge-active)" : undefined,
                  opacity: isDimmed ? 0.5 : 0.85,
                }}
              />
            );
          })}
        </g>

        {/* Center hub: Externe Faktoren */}
        <g className={mounted ? "pestel-center" : ""}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={hubRadius}
            fill="var(--card)"
            stroke="var(--pestel-center)"
            strokeWidth="2"
            filter="url(#pestel-center-glow)"
          />
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--card-foreground)"
            fontWeight="600"
            fontSize="16"
          >
            {companyName && companyName.trim() ? (
              <>
                <tspan x={CENTER} dy="-8">Externe Faktoren</tspan>
                <tspan x={CENTER} dy="20">„{companyName.trim()}“</tspan>
              </>
            ) : (
              "Externe Faktoren"
            )}
          </text>
        </g>

        {/* Factor nodes on orbit */}
        {positionedNodes.map((node, idx) => {
          const isActive = node.id === selectedClusterKey;
          const isHovered = node.id === hoveredId;
          const isFocused = node.id === focusedId;
          const isDimmed =
            hasSelection && !isActive && selectedClusterKey !== node.id;
          const semanticColor = PESTEL_COLORS[node.category];
          const { w, h } = pillDimensions(node.label, node.importance);
          const fontSize = 11 + Math.min(2, node.importance);
          const fontWeight = node.importance >= 4 ? 600 : 500;
          const displayLabel =
            node.label.length <= 14 ? node.label : node.label.slice(0, 12) + "…";
          const rx = h / 2;

          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}, ${node.category}, Wichtigkeit ${node.importance}. Details anzeigen`}
              className={`pestel-node ${isActive ? "pestel-node-active" : ""} ${mounted ? "pestel-node-enter" : ""}`}
              style={{
                transformOrigin: `${round2(node.x)}px ${round2(node.y)}px`,
                opacity: isDimmed ? 0.75 : 1,
                animationDelay: `${idx * 0.05}s`,
              }}
              onClick={() => onClusterClick(node.cluster)}
              onKeyDown={(e) => handleKeyDown(e, node)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setFocusedId(node.id)}
              onBlur={() => setFocusedId(null)}
            >
              <title>Details anzeigen</title>
              {/* Importance ring around pill */}
              <rect
                x={round2(node.x - w / 2 - 3)}
                y={round2(node.y - h / 2 - 3)}
                width={w + 6}
                height={h + 6}
                rx={rx + 3}
                ry={rx + 3}
                fill="none"
                stroke={semanticColor}
                strokeWidth="1"
                opacity={isActive || isHovered ? 0.5 : 0.25}
              />
              {/* Node pill: dark fill, semantic stroke/glow */}
              <rect
                x={round2(node.x - w / 2)}
                y={round2(node.y - h / 2)}
                width={w}
                height={h}
                rx={rx}
                ry={rx}
                fill="var(--card)"
                stroke={semanticColor}
                strokeWidth={isActive || isHovered || isFocused ? 2.5 : 1.5}
                filter={
                  isActive || isHovered ? "url(#pestel-node-glow)" : undefined
                }
              />
              <text
                x={round2(node.x)}
                y={round2(node.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--card-foreground)"
                fontWeight={fontWeight}
                fontSize={fontSize}
                className="select-none pointer-events-none"
              >
                {displayLabel}
              </text>
            </g>
          );
        })}

        {/* Ghost nodes: missing PESTEL categories, no interaction */}
        {ghostNodes.map((ghost) => {
          const semanticColor = PESTEL_COLORS[ghost.category];
          const { w, h } = pillDimensions(ghost.label, 3);
          const rx = h / 2;
          const displayLabel =
            ghost.label.length <= 14 ? ghost.label : ghost.label.slice(0, 12) + "…";
          return (
            <g
              key={`ghost-${ghost.id}`}
              className="pestel-ghost"
              aria-hidden
              style={{ transformOrigin: `${round2(ghost.x)}px ${round2(ghost.y)}px` }}
            >
              <title>Aktuell habe ich keine Insights gefunden, die für dich relevant sind</title>
              <rect
                x={round2(ghost.x - w / 2)}
                y={round2(ghost.y - h / 2)}
                width={w}
                height={h}
                rx={rx}
                ry={rx}
                fill="transparent"
                stroke={semanticColor}
                strokeWidth={1}
                strokeDasharray="3 2"
              />
              <text
                x={round2(ghost.x)}
                y={round2(ghost.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted-foreground)"
                fontWeight="400"
                fontSize="11"
                className="select-none pointer-events-none"
              >
                {displayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Build cluster nodes from artifact categories */
export function buildClusterNodes(
  categories: ExternalDriversCategory[],
  showLowConfidence: boolean
): ClusterNode[] {
  const byCluster = new Map<
    string,
    { title: string; drivers: ExternalDriver[] }
  >();

  for (const cat of categories) {
    const relevance = cat.relevance ?? "medium";
    if (relevance === "low") continue;

    const clusterKey = cat.clusterKey ?? cat.id;
    const clusterTitle = cat.clusterTitle ?? cat.title;

    for (const driver of cat.drivers ?? []) {
      const conf = driver.confidence ?? "low";
      if (!showLowConfidence && conf === "low") continue;

      const existing = byCluster.get(clusterKey);
      if (existing) {
        existing.drivers.push(driver);
      } else {
        byCluster.set(clusterKey, { title: clusterTitle, drivers: [driver] });
      }
    }
  }

  return [...byCluster.entries()].map(([clusterKey, { title, drivers }]) => {
    const highConfidenceCount = drivers.filter(
      (d) => (d.confidence ?? "low") === "high"
    ).length;
    const hasFresh = drivers.some(isDriverFresh);
    return {
      clusterKey,
      clusterTitle: title,
      drivers,
      highConfidenceCount,
      hasFresh,
    };
  });
}
