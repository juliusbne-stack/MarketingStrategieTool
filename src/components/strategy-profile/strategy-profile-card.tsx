"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  Target,
  Users,
  Package,
  Layers,
  TrendingUp,
  Award,
  Compass,
  Shield,
  Sparkles,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mapStrategyProfile,
  type StrategyProfileData,
  type WhereToPlayItem,
  type HowToWinItem,
  type WhereToPlayCluster,
  type HowToWinCluster,
} from "@/lib/strategy-profile-mapper";
import {
  getTooltip,
  deriveStrategicFocus,
  formatHeroStatement,
  CLUSTER_ICON_NAMES,
  CLUSTER_IMPACT_LINES,
  AREA_ACCENT_CLASSES,
  AREA_TEXT_ACCENT,
  type ClusterId,
} from "@/lib/strategy-profile-display";

const ICON_MAP = {
  globe: Globe,
  target: Target,
  users: Users,
  package: Package,
  layers: Layers,
  "trending-up": TrendingUp,
  award: Award,
  compass: Compass,
  shield: Shield,
  sparkles: Sparkles,
  "bar-chart": BarChart3,
} as const;

function ValueWithTooltip({
  item,
  children,
}: {
  item: WhereToPlayItem | HowToWinItem;
  children: React.ReactNode;
}) {
  const tip = getTooltip(item.fieldKey);
  return (
    <span className="inline-flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-2">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] space-y-2 text-left">
          <p>
            <span className="font-medium">Bedeutung: </span>
            <span className="text-muted-foreground">{tip.meaning}</span>
          </p>
          <p>
            <span className="font-medium">Warum wichtig: </span>
            <span className="text-muted-foreground">{tip.whyImportant}</span>
          </p>
          <p>
            <span className="font-medium">Implikation: </span>
            <span className="text-muted-foreground">{tip.implication}</span>
          </p>
          <p className="pt-1.5 mt-1.5 border-t border-border/50">
            <span className="font-medium">Strategische Implikation: </span>
            <span className="text-muted-foreground">{tip.nextStep}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function WhereToPlayRow({ item }: { item: WhereToPlayItem }) {
  const Icon = ICON_MAP[item.icon] ?? Target;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {item.label}
        </p>
        <p className="text-sm font-medium">
          <ValueWithTooltip item={item}>{item.value}</ValueWithTooltip>
        </p>
      </div>
    </div>
  );
}

function HowToWinRow({ item }: { item: HowToWinItem }) {
  const Icon = ICON_MAP[item.icon] ?? Award;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {item.label}
        </p>
        <p className="text-sm font-medium">
          <ValueWithTooltip item={item}>{item.value}</ValueWithTooltip>
        </p>
      </div>
    </div>
  );
}

/** Executive Block: Hero + 3 Kern-Dimensionen (Leitlinie, Zielmarkt, Differenzierung) */
function ExecutiveBlock({
  statementText,
  data,
}: {
  statementText: string;
  data: StrategyProfileData;
}) {
  const focus = deriveStrategicFocus(data);
  const hasKeyPoints =
    focus?.keyPoints.direction ||
    focus?.keyPoints.market ||
    focus?.keyPoints.differentiator;

  return (
    <div className="space-y-4">
      <p className="text-2xl font-semibold leading-snug mb-6">{statementText}</p>
      {hasKeyPoints && (
        <>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            {focus!.keyPoints.direction && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  🧭 Strategische Leitlinie
                </p>
                <p className="font-medium">{focus!.keyPoints.direction}</p>
              </div>
            )}
            {focus!.keyPoints.market && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  🎯 Zielmarkt
                </p>
                <p className="font-medium">{focus!.keyPoints.market}</p>
              </div>
            )}
            {focus!.keyPoints.differentiator && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  🏆 Haupt-Differenzierung
                </p>
                <p className="font-medium">{focus!.keyPoints.differentiator}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClusterCardWrapper({
  cluster,
  area,
  children,
}: {
  cluster: { title: string };
  area: "where" | "how";
  children: React.ReactNode;
}) {
  const accentClass = AREA_ACCENT_CLASSES[area];
  const textClass = AREA_TEXT_ACCENT[area];
  const iconKey = CLUSTER_ICON_NAMES[cluster.title as ClusterId] ?? "target";
  const Icon = ICON_MAP[iconKey as keyof typeof ICON_MAP] ?? Target;
  const impactLine =
    CLUSTER_IMPACT_LINES[cluster.title as ClusterId] ?? null;

  return (
    <Card className={`relative border pl-4 ${accentClass}`}>
      <div className="absolute -top-3 left-4 z-10">
        <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold shadow-sm">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${textClass}`} />
          <span className={textClass}>{cluster.title}</span>
        </div>
      </div>
      <CardContent className="space-y-0 pt-6">
        {children}
        {impactLine && (
          <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground/80 mb-0.5">
              Was das für dich heißt
            </p>
            <p className="text-sm text-muted-foreground">{impactLine}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhereToPlayClusterCard({ cluster }: { cluster: WhereToPlayCluster }) {
  return (
    <ClusterCardWrapper cluster={cluster} area="where">
      {cluster.items.map((item, i) => (
        <WhereToPlayRow key={i} item={item} />
      ))}
    </ClusterCardWrapper>
  );
}

function HowToWinClusterCard({ cluster }: { cluster: HowToWinCluster }) {
  return (
    <ClusterCardWrapper cluster={cluster} area="how">
      {cluster.items.map((item, i) => (
        <HowToWinRow key={i} item={item} />
      ))}
    </ClusterCardWrapper>
  );
}

export interface StrategyProfileCardProps {
  data: StrategyProfileData;
  /** Step title, e.g. "Strategieprofil" */
  stepTitle?: string;
}

const STORAGE_KEY = "p1_strategy_profile_open";

function getStoredOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function setStoredOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // ignore
  }
}

export function StrategyProfileCard({
  data,
  stepTitle = "Strategieprofil",
}: StrategyProfileCardProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(getStoredOpen());
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setStoredOpen(next);
  };

  const mapped = mapStrategyProfile(data);
  const hasClusters =
    mapped.whereToPlayClusters.length > 0 || mapped.howToWinClusters.length > 0;
  const heroStatement =
    formatHeroStatement(mapped.statementText) || mapped.statementText;

  return (
    <TooltipProvider>
      <Card className="overflow-hidden border-2 shadow-lg">
        <Collapsible open={open} onOpenChange={handleOpenChange}>
          <CollapsibleTrigger asChild>
            <CardHeader
              className={cn(
                "relative cursor-pointer border-b bg-muted/30 transition-colors hover:bg-muted/50",
                open ? "pb-6" : "py-4"
              )}
            >
              <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-2xl">{stepTitle}</CardTitle>
                  {!open && heroStatement && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {heroStatement}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180"
                  )}
                  aria-hidden
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <CardContent className="space-y-6 pt-6">
              {/* Executive-Block: Hero + 3 Kern-Dimensionen */}
              <ExecutiveBlock
                statementText={heroStatement}
                data={data}
              />

              {/* Where to play / How to win - 2 columns, 3 cluster cards each */}
              {hasClusters && (
                <div className="grid gap-6 md:grid-cols-2">
                  {mapped.whereToPlayClusters.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight">
                          Where to play
                        </h3>
                        <div className="mt-2 mb-6 h-[3px] w-12 rounded-full bg-[#0F52BA]" />
                      </div>
                      <div className="space-y-4">
                        {mapped.whereToPlayClusters.map((cluster, i) => (
                          <WhereToPlayClusterCard key={i} cluster={cluster} />
                        ))}
                      </div>
                    </div>
                  )}
                  {mapped.howToWinClusters.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight">
                          How to win
                        </h3>
                        <div className="mt-2 mb-6 h-[3px] w-12 rounded-full bg-[#4682B4]" />
                      </div>
                      <div className="space-y-4">
                        {mapped.howToWinClusters.map((cluster, i) => (
                          <HowToWinClusterCard key={i} cluster={cluster} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}
