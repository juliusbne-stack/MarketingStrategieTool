"use client";

import { useMemo, useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import {
  PestelBoard,
  buildClusterNodes,
  type ClusterNode,
} from "./pestel-board";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExternalDriversSheetContent } from "./external-drivers-sheet";
import { SearchSetupBox } from "./search-setup-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { refreshExternalDrivers } from "@/app/actions/external-insight-actions";
import type {
  JobDiagnostics,
  ExternalSearchError,
} from "@/app/actions/external-insight-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  ExternalDriversArtifact,
  ExternalDriversCategory,
  ExternalDriver,
  ExternalDriverSource,
} from "@/lib/server/external-drivers-types";
import {
  hasValidSource,
  isDisplayableDriver,
  hasValidStrategicImplication,
} from "@/lib/server/external-drivers-types";

interface ExternalDriversSectionProps {
  data: ExternalDriversArtifact | Record<string, unknown>;
  /** Company name for center label in PESTEL diagram (from strategy_profile): "Externe Faktoren „Name"" or "Externe Faktoren" */
  companyName?: string | null;
  /** When provided, shows refresh button */
  projectId?: number;
  /** Last generated timestamp (ISO) for "vor X Tagen" display */
  generatedAt?: string | null;
  /** When true, disable refresh (rate limited) */
  refreshDisabled?: boolean;
  /** Tooltip when refresh disabled */
  refreshDisabledReason?: string;
  /** When false, show setup box and disable refresh */
  searchConfigured?: boolean;
  /** When true, show Force Refresh button (dev only, bypasses cache + rate limit) */
  showForceRefresh?: boolean;
  /** When last refresh failed with search error – show Alert instead of empty state */
  lastSearchError?: ExternalSearchError | null;
  /** Dev only: last job status + diagnostics for bottleneck analysis */
  lastJob?: {
    status: string;
    finishedAt: string | null;
    error: string | null;
    diagnostics: JobDiagnostics | null;
  } | null;
  /** Dev only: show low-confidence drivers */
  showLowConfidence?: boolean;
}

export type PestelDiagnostics = {
  clustersCount: number;
  driversCount: number;
  filteredLowRelevance: number;
  invalidMissingImplication: number;
  sourcesCount: number;
  latestDate: string | null;
};

function getClustersAndDiagnostics(
  data: ExternalDriversArtifact | Record<string, unknown>,
  showLowConfidence: boolean
): {
  clusters: ClusterNode[];
  diagnostics: PestelDiagnostics;
} {
  const artifact = data as ExternalDriversArtifact;
  const categories = (artifact.categories ?? []) as ExternalDriversCategory[];
  const fromExternalSearch = !!artifact.generatedAt;

  let filteredLowRelevance = 0;
  let invalidMissingImplication = 0;
  const allDates: string[] = [];
  const sourceUrls = new Set<string>();

  const validCategories: ExternalDriversCategory[] = [];
  for (const cat of categories) {
    const relevance = cat.relevance ?? "medium";
    if (relevance === "low") {
      filteredLowRelevance += (cat.drivers ?? []).length;
      continue;
    }

    const validDrivers: ExternalDriver[] = [];
    for (const driver of cat.drivers ?? []) {
      if (!isDisplayableDriver(driver, fromExternalSearch)) continue;
      const validSources = (driver.sources ?? []).filter(
        (s): s is ExternalDriverSource & { date: string } => hasValidSource(s)
      );
      if (validSources.length === 0) continue;
      if (!hasValidStrategicImplication(driver)) {
        invalidMissingImplication++;
        continue;
      }
      validDrivers.push(driver);
      allDates.push(validSources[0].date);
      sourceUrls.add(validSources[0].url);
    }
    if (validDrivers.length > 0) {
      validCategories.push({ ...cat, drivers: validDrivers });
    }
  }

  const clusters = buildClusterNodes(validCategories, showLowConfidence);

  const latestDate =
    allDates.length > 0
      ? allDates.sort((a, b) => b.localeCompare(a))[0] ?? null
      : null;

  return {
    clusters,
    diagnostics: {
      clustersCount: clusters.length,
      driversCount: clusters.reduce((s, c) => s + c.drivers.length, 0),
      filteredLowRelevance,
      invalidMissingImplication,
      sourcesCount: sourceUrls.size,
      latestDate,
    },
  };
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "vor 1 Woche" : `vor ${weeks} Wochen`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "vor 1 Monat" : `vor ${months} Monaten`;
}

const isDev = process.env.NODE_ENV === "development";
/** Set NEXT_PUBLIC_HIDE_UMFELD_DEV_UI=true in .env.local to hide dev UI and see production-like dashboard */
const showDevUI = isDev && process.env.NEXT_PUBLIC_HIDE_UMFELD_DEV_UI !== "true";

function getSearchErrorAlertMessage(err: ExternalSearchError): string {
  if (isDev) {
    const parts = [`${err.provider}${err.statusCode != null ? ` ${err.statusCode}` : ""}: ${err.message}`];
    if (err.isAuthError) {
      const dashboard = err.provider === "serpapi" ? "SerpApi" : err.provider === "brave" ? "Brave" : "Serper";
      parts.push(`Prüfe SEARCH_API_KEY in ENV und ${dashboard} Dashboard.`);
    }
    return parts.join(" ");
  }
  return "Bitte API-Konfiguration prüfen oder später erneut versuchen.";
}

const DIAGNOSTIC_KEYS = [
  "partialSearch",
  "rawOrganicCount",
  "rawNewsCount",
  "whitelistKeptCount",
  "verifiedCount",
  "datedKeptCount",
  "driversKeptCount",
  "unclassifiedSourcesCount",
  "driversByConfidence",
  "sourcesDroppedNotVerified",
  "sourcesDroppedNoDate",
  "driversDroppedNoDate",
  "driversDroppedTooFewSources",
  "driversDroppedNotEnoughDomains",
  "errorStage",
  "minSourcesRequired",
  "minDomainsRequired",
  "sourcesKeptByType",
  "sourcesKeptByTier",
] as const;

export function ExternalDriversSection({
  data,
  projectId,
  generatedAt,
  refreshDisabled,
  refreshDisabledReason,
  searchConfigured = true,
  showForceRefresh = false,
  lastSearchError: initialSearchError = null,
  lastJob: initialLastJob = null,
  showLowConfidence = false,
  companyName = null,
}: ExternalDriversSectionProps) {
  const { clusters, diagnostics } = useMemo(
    () => getClustersAndDiagnostics(data, showLowConfidence),
    [data, showLowConfidence]
  );
  const [sheetCluster, setSheetCluster] = useState<ClusterNode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<ExternalSearchError | null>(null);
  const [lastDiagnostics, setLastDiagnostics] = useState<
    JobDiagnostics | null
  >(null);

  const activeSearchError = searchError ?? initialSearchError ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const router = useRouter();

  const isRefreshDisabled = !searchConfigured || refreshDisabled;

  const handleRefresh = (force = false) => {
    if (!projectId || isPending) return;
    if (!force && isRefreshDisabled) return;
    setError(null);
    setSearchError(null);
    startTransition(async () => {
      try {
        const result = await refreshExternalDrivers({ projectId, force });
        if (result?.success && result.diagnostics) {
          setLastDiagnostics(result.diagnostics);
          setSearchError(null);
          router.refresh();
        } else if (result?.diagnostics) {
          setLastDiagnostics(result.diagnostics);
          router.refresh();
        }
        if (result && !result.success) {
          if (result.externalSearchStatus === "error" && result.externalSearchError) {
            setSearchError(result.externalSearchError);
          }
          if (result.error) {
            setError(result.error);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const hasAnyCategories = Array.isArray((data as ExternalDriversArtifact).categories) &&
    ((data as ExternalDriversArtifact).categories ?? []).length > 0;

  return (
    <div className="flex flex-col gap-0 w-full">
      {!searchConfigured && <SearchSetupBox />}
      {projectId != null && (
        <div className="flex items-center justify-between gap-1 py-0">
          <div className="text-xs text-muted-foreground">
            {generatedAt && formatRelativeTime(generatedAt) && (
              <>Zuletzt aktualisiert: {formatRelativeTime(generatedAt)}</>
            )}
          </div>
          {isRefreshDisabled && !showForceRefresh ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-disabled
                    tabIndex={-1}
                    className="text-xs pointer-events-none opacity-60"
                  >
                    Aktualisieren
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px]">
                {!searchConfigured
                  ? "Web-Recherche nicht konfiguriert. Siehe Setup oben."
                  : refreshDisabledReason ?? "Nächste Aktualisierung in 24h möglich"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(false)}
                      disabled={
                        isPending || !searchConfigured || isRefreshDisabled
                      }
                      className="text-xs"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5">
                        {isPending ? "Aktualisiere…" : "Aktualisieren"}
                      </span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  {isRefreshDisabled
                    ? refreshDisabledReason ?? "Nächste Aktualisierung in 24 Stunden möglich"
                    : "Lädt neue Umfeld-Insights aus der Web-Recherche. Externe Faktoren und Trends (PESTEL) werden aktualisiert. Aktualisierung alle 24 Stunden möglich."}
                </TooltipContent>
              </Tooltip>
              {showDevUI && showForceRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(true)}
                      disabled={isPending || !searchConfigured}
                      className="text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5">Erzwingen</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ignoriert Cache und Rate-Limit (nur Dev)
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
      {activeSearchError && (
        <Alert variant="destructive">
          <AlertTitle>Externe Umfeldsuche fehlgeschlagen</AlertTitle>
          <AlertDescription>
            {getSearchErrorAlertMessage(activeSearchError)}
          </AlertDescription>
          {isDev && (
            <Collapsible
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              className="mt-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-0 text-xs -ml-1"
                  aria-expanded={detailsOpen}
                >
                  {detailsOpen ? "Details ausblenden" : "Details anzeigen"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table className="mt-2">
                  <TableBody>
                    {activeSearchError.provider != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          provider
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(activeSearchError.provider)}
                        </TableCell>
                      </TableRow>
                    )}
                    {activeSearchError.statusCode != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          statusCode
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(activeSearchError.statusCode)}
                        </TableCell>
                      </TableRow>
                    )}
                    {activeSearchError.message != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          message
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(activeSearchError.message)}
                        </TableCell>
                      </TableRow>
                    )}
                    {activeSearchError.isAuthError != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          isAuthError
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(activeSearchError.isAuthError)}
                        </TableCell>
                      </TableRow>
                    )}
                    {lastDiagnostics?.fallbackUsed != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          fallbackUsed
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(lastDiagnostics.fallbackUsed)}
                        </TableCell>
                      </TableRow>
                    )}
                    {lastDiagnostics?.fallbackProvider != null && (
                      <TableRow>
                        <TableCell className="text-xs font-medium py-1 w-32">
                          fallbackProvider
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {String(lastDiagnostics.fallbackProvider)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(false)}
              disabled={
                isPending ||
                !projectId ||
                !searchConfigured ||
                isRefreshDisabled
              }
              className="text-xs"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Erneut versuchen</span>
            </Button>
            {showDevUI && showForceRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefresh(true)}
                disabled={isPending || !projectId || !searchConfigured}
                className="text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Erzwingen</span>
              </Button>
            )}
          </div>
        </Alert>
      )}
      {error && !activeSearchError && (
        <p className="text-xs text-destructive">
          {error === "SEARCH_NOT_CONFIGURED"
            ? "Web-Recherche nicht konfiguriert. Siehe Setup oben."
            : error}
        </p>
      )}

      {showDevUI && showForceRefresh && (initialLastJob || lastDiagnostics) && (
        <Collapsible className="rounded-md border border-amber-500/30 bg-amber-500/5">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              Letzter Job: {initialLastJob?.status ?? "—"} · {initialLastJob?.finishedAt ? new Date(initialLastJob.finishedAt).toLocaleString() : "—"}
              {initialLastJob?.error && (
                <Badge variant="destructive" className="text-[10px] ml-1">
                  Fehler
                </Badge>
              )}
              {(lastDiagnostics ?? initialLastJob?.diagnostics)?.partialSearch && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  partialSearch
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table className="text-xs">
              <TableBody>
                {DIAGNOSTIC_KEYS.map((key) => {
                  const diag = lastDiagnostics ?? initialLastJob?.diagnostics;
                  const val = diag && key in diag ? (diag as Record<string, unknown>)[key] : undefined;
                  if (val == null && key !== "errorStage") return null;
                  const display =
                    typeof val === "object" && val !== null
                      ? JSON.stringify(val)
                      : String(val ?? "—");
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium py-1 w-40">{key}</TableCell>
                      <TableCell className="py-1 break-all text-xs">{display}</TableCell>
                    </TableRow>
                  );
                })}
                {initialLastJob?.error && (
                  <TableRow>
                    <TableCell className="font-medium py-1 w-40">error</TableCell>
                    <TableCell className="py-1 text-destructive break-all">{initialLastJob.error}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}
      {activeSearchError ? null : clusters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium text-muted-foreground">
              Keine verifizierten Umfeld-Signale gefunden.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Es werden nur Treiber mit mindestens 2 seriösen Quellen und Veröffentlichungsdatum angezeigt.
            </p>
            {hasAnyCategories && (
              <p className="text-xs text-muted-foreground mt-2">
                Nutze „Aktualisieren“, um Umfeld-Insights aus der Web-Recherche zu laden.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {showDevUI && showForceRefresh && (
            <Collapsible className="rounded-md border my-0">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground h-7 py-0"
                >
                  PESTEL-Diagnostics
                  <Badge variant="secondary" className="text-[10px]">
                    {diagnostics.clustersCount} Cluster · {diagnostics.driversCount} Treiber · {diagnostics.filteredLowRelevance} low relevance · {diagnostics.invalidMissingImplication} invalid
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Metrik</TableHead>
                      <TableHead className="text-xs">Wert</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Cluster</TableCell>
                      <TableCell className="text-xs">{diagnostics.clustersCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Treiber</TableCell>
                      <TableCell className="text-xs">{diagnostics.driversCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Ausgefiltert (low relevance)</TableCell>
                      <TableCell className="text-xs">{diagnostics.filteredLowRelevance}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Invalid (fehlende Implikation)</TableCell>
                      <TableCell className="text-xs">{diagnostics.invalidMissingImplication}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Quellenanzahl</TableCell>
                      <TableCell className="text-xs">{diagnostics.sourcesCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Aktuellstes Datum</TableCell>
                      <TableCell className="text-xs">{diagnostics.latestDate ?? "—"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {lastDiagnostics && (
                  <>
                    <div className="px-4 py-2 text-xs font-medium border-t">Job-Diagnostics</div>
                    <Table>
                      <TableBody>
                        {lastDiagnostics.envStatus && (
                          <>
                            <TableRow>
                              <TableCell className="text-xs font-medium">searchProviderSet</TableCell>
                              <TableCell className="text-xs">
                                {String(lastDiagnostics.envStatus.searchProviderSet)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-xs font-medium">apiKeyPresent</TableCell>
                              <TableCell className="text-xs">
                                {String(lastDiagnostics.envStatus.apiKeyPresent)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-xs font-medium">apiKeyLength</TableCell>
                              <TableCell className="text-xs">
                                {lastDiagnostics.envStatus.apiKeyLength}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-xs font-medium">endpointUsed</TableCell>
                              <TableCell className="text-xs">
                                {lastDiagnostics.envStatus.endpointUsed}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-xs font-medium">providerName</TableCell>
                              <TableCell className="text-xs">
                                {lastDiagnostics.envStatus.providerName}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-xs font-medium">runtime</TableCell>
                              <TableCell className="text-xs">
                                {lastDiagnostics.envStatus.runtime}
                              </TableCell>
                            </TableRow>
                            {lastDiagnostics.envStatus.runtime === "edge" &&
                              !lastDiagnostics.envStatus.apiKeyPresent && (
                              <TableRow>
                                <TableCell colSpan={2} className="text-xs text-amber-600 dark:text-amber-500">
                                  Edge Runtime hat keinen Zugriff auf Node ENV. Prüfe runtime-Konfiguration.
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                        {Object.entries(lastDiagnostics)
                          .filter(([k, v]) => k !== "envStatus" && v != null && v !== "")
                          .map(([k, v]) => (
                            <TableRow key={k}>
                              <TableCell className="text-xs font-medium">{k}</TableCell>
                              <TableCell className="text-xs">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
          {clusters.length === 1 && projectId && (
            <p className="text-xs text-muted-foreground italic mb-0">
              Nur eine Kategorie angezeigt. Klicke auf „Aktualisieren“ oder „Erzwingen“, um weitere PESTEL-Kategorien (z.B. Politisch, Technologisch) zu laden.
            </p>
          )}
          <PestelBoard
            clusters={clusters}
            companyName={companyName}
            selectedCluster={sheetCluster}
            onClusterClick={(c) => setSheetCluster(c)}
          />
          <Sheet
            open={!!sheetCluster}
            onOpenChange={(open) => !open && setSheetCluster(null)}
          >
            <SheetContent className="flex flex-col sm:max-w-xl overflow-hidden">
              {sheetCluster && (
                <ExternalDriversSheetContent
                  category={{
                    id: sheetCluster.clusterKey,
                    title: sheetCluster.clusterTitle,
                    drivers: [...sheetCluster.drivers].sort((a, b) => {
                      const impactA = a.impact ?? 0;
                      const impactB = b.impact ?? 0;
                      if (impactB !== impactA) return impactB - impactA;
                      const confOrder = { high: 3, medium: 2, low: 1 };
                      const confA = confOrder[a.confidence ?? "low"] ?? 0;
                      const confB = confOrder[b.confidence ?? "low"] ?? 0;
                      if (confB !== confA) return confB - confA;
                      const dateA = a.freshestSourceDate ?? "";
                      const dateB = b.freshestSourceDate ?? "";
                      return dateB.localeCompare(dateA);
                    }),
                  }}
                />
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
