"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ExternalDriversCategory,
  ExternalDriver,
  ExternalDriverSource,
} from "@/lib/server/external-drivers-types";
import { TextWithCompanyLinks } from "@/components/ui/text-with-company-links";
import { getDomainLabels } from "@/lib/server/domain-registry";

interface ExternalDriversSheetContentProps {
  category: ExternalDriversCategory;
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

function SourceCard({ src }: { src: ExternalDriverSource }) {
  const labels = src.url ? getDomainLabels(src.url) : null;

  return (
    <a
      href={src.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm">{src.name || src.domain || "Quelle"}</span>
        {labels?.typeLabel && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {labels.typeLabel}
          </Badge>
        )}
      </div>
      {src.domain && (
        <div className="text-xs text-muted-foreground mt-0.5">{src.domain}</div>
      )}
      {src.date && (
        <div className="text-xs text-muted-foreground mt-0.5">{src.date}</div>
      )}
    </a>
  );
}

function DriverCard({ driver }: { driver: ExternalDriver }) {
  const summary = driver.summary ?? driver.description ?? "";
  const impact = driver.impact;
  const horizon = driver.horizon;
  const direction = driver.direction;
  const tags = driver.tags ?? [];
  const sourceCount = driver.sourceCount ?? driver.sources?.length ?? 0;
  const domainCount = driver.domainCount ?? new Set(driver.sources?.map((s) => s.domain)).size ?? 0;
  const freshestDate = driver.freshestSourceDate;
  const [showExtended, setShowExtended] = useState(false);
  const extendedSummary = driver.extendedSummary?.trim() ?? "";
  const hasExtendedContent =
    extendedSummary.length > 0 ||
    (driver.relevanceReason && driver.relevanceReason.trim().length > 0) ||
    summary.length > 200;

  return (
    <Collapsible defaultOpen className="rounded-lg border">
      <div className="p-4 space-y-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-wrap items-start justify-between gap-2 cursor-pointer group -m-1 p-1 rounded hover:bg-muted/30 transition-colors w-full text-left"
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5 group-data-[state=closed]:rotate-[-90deg] transition-transform" />
              <h4 className="font-semibold text-base text-left">{driver.title}</h4>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 pl-6">
            {/* Untertitel: klickbar wenn Mehr-lesen-Inhalt vorhanden (Haupttitel steht im Header) */}
            {summary && (
              hasExtendedContent ? (
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowExtended(!showExtended);
                    }}
                    className="flex items-center gap-1.5 w-full text-left -ml-1 py-0.5 rounded hover:bg-muted/30 transition-colors group/btn"
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showExtended ? "rotate-90" : ""}`}
                    />
                    <span className="text-sm text-muted-foreground font-medium">
                      {summary}
                    </span>
                  </button>
                  {showExtended && (
                    <div className="rounded-md bg-muted/30 px-3 py-2.5 mt-2 space-y-2">
                      {extendedSummary ? (
                        <>
                          <p className="text-xs font-medium text-foreground">Zusammenfassung der Quellen</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            <TextWithCompanyLinks
                              text={extendedSummary}
                              entityLinks={driver.entityLinks}
                              linkClassName="underline hover:text-foreground text-muted-foreground"
                            />
                          </p>
                        </>
                      ) : (
                        driver.relevanceReason && (
                          <>
                            <p className="text-xs font-medium text-foreground">Relevanz</p>
                            <p className="text-sm text-muted-foreground">
                              <TextWithCompanyLinks
                                text={driver.relevanceReason}
                                entityLinks={driver.entityLinks}
                                linkClassName="underline hover:text-foreground text-muted-foreground"
                              />
                            </p>
                          </>
                        )
                      )}
                      {extendedSummary && driver.relevanceReason && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-foreground mb-0.5">Relevanz für dein Unternehmen</p>
                          <p className="text-sm text-muted-foreground">
                            <TextWithCompanyLinks
                              text={driver.relevanceReason}
                              entityLinks={driver.entityLinks}
                              linkClassName="underline hover:text-foreground text-muted-foreground"
                            />
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <TextWithCompanyLinks
                    text={summary}
                    entityLinks={driver.entityLinks}
                    linkClassName="underline hover:text-foreground text-muted-foreground"
                  />
                </p>
              )
            )}
            {driver.strategicImplication && (
              <div className="rounded-md bg-muted/50 px-3 py-2 border-l-2 border-primary/30">
                <p className="text-xs font-medium text-foreground mb-0.5">Strategieableitung</p>
                <p className="text-sm text-muted-foreground">
                  <TextWithCompanyLinks
                    text={driver.strategicImplication}
                    entityLinks={driver.entityLinks}
                    linkClassName="underline hover:text-foreground text-muted-foreground"
                  />
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center text-xs">
              {impact != null && (
                <Badge variant="secondary" className="font-normal">
                  Impact {impact}
                </Badge>
              )}
              {horizon && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="font-normal cursor-help">
                      {horizon === "now" ? "Jetzt" : horizon === "3-12m" ? "3–12 Monate" : "12m+"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    {horizon === "now"
                      ? "Zeithorizont: Der Treiber ist bereits jetzt relevant."
                      : horizon === "3-12m"
                        ? "Zeithorizont: Erwartete Relevanz in 3 bis 12 Monaten."
                        : "Zeithorizont: Erwartete Relevanz in mehr als 12 Monaten."}
                  </TooltipContent>
                </Tooltip>
              )}
              {direction && (
                <Badge
                  variant={direction === "chance" ? "default" : direction === "risk" ? "destructive" : "outline"}
                  className="font-normal"
                >
                  {direction === "chance" ? "Chance" : direction === "risk" ? "Risiko" : "Neutral"}
                </Badge>
              )}
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="font-normal">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {sourceCount} Quellen · {domainCount} Domains
              {freshestDate && (
                <span className="ml-2">· Aktuell: {formatRelativeTime(freshestDate)}</span>
              )}
            </div>
            {driver.sources && driver.sources.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1.5 px-2 text-xs font-medium flex items-center gap-1.5 -ml-2 group"
                  >
                    <ChevronRight className="h-3.5 w-3.5 group-data-[state=open]:rotate-90 transition-transform shrink-0" />
                    <FileText className="h-3.5 w-3.5" />
                    Quellen ({driver.sources.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid gap-2 mt-2 pl-1">
                    {driver.sources.map((src, j) => (
                      <SourceCard key={j} src={src} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Renders the content inside SheetContent (header + driver list) */
export function ExternalDriversSheetContent({
  category,
}: ExternalDriversSheetContentProps) {
  const drivers = category.drivers ?? [];

  if (drivers.length === 0) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{category.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p>Keine Treiber mit verifizierten Quellen in dieser Kategorie.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{category.title}</SheetTitle>
        {category.summary && (
          <SheetDescription>{category.summary}</SheetDescription>
        )}
      </SheetHeader>
      <TooltipProvider>
        <div className="flex flex-col gap-6 py-4 pr-2 overflow-y-auto flex-1 min-h-0">
          {drivers.map((driver, i) => (
          <div key={i}>
            {i > 0 && <Separator className="my-4" />}
            <DriverCard driver={driver} />
          </div>
        ))}
        </div>
      </TooltipProvider>
    </>
  );
}
