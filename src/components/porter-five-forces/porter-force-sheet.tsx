"use client";

import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import { TextWithCompanyLinks } from "@/components/ui/text-with-company-links";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PorterForce, PorterSource, SubstitutesDetailed } from "./porter-five-forces-board";

interface PorterForceSheetContentProps {
  force: PorterForce;
}

function SourcesSection({ sources }: { sources?: PorterSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <Collapsible defaultOpen={false} className="group rounded-lg border bg-muted/10">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset rounded-lg"
        >
          <span className="font-semibold text-sm text-foreground">
            Genutzte Quellen ({sources.length})
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="list-none space-y-2 px-4 pb-4 pt-0 border-t border-border/50">
          {sources.map((s, i) => (
            <li key={i} className="pt-3 first:pt-3">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline break-all"
              >
                {s.title || s.url}
              </a>
              {(s.publisher || s.date) && (
                <span className="block text-xs text-muted-foreground/80 mt-0.5">
                  {[s.publisher, s.date].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 pb-8 border-b border-border/40">
      <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function isSubstitutesDetailed(da: PorterForce["detailed_analysis"]): da is SubstitutesDetailed {
  return da != null && "top_substitutes" in da && Array.isArray((da as SubstitutesDetailed).top_substitutes);
}

const FORCE_EXPLANATIONS: Record<string, string> = {
  new_entrants:
    "Wie leicht können neue Konkurrenten in deinen Markt einsteigen? Hohe Barrieren (z.B. Kapital, Zulassungen) halten neue Wettbewerber fern – vorteilhaft, wenn du bereits im Markt bist. Niedrige Barrieren bedeuten: Es können jederzeit neue Anbieter hinzukommen.",
  substitutes:
    "Welche Alternativen haben Kunden zu deinem Angebot? Z.B. selbst machen, andere Anbieter wählen oder das Problem anders lösen. Je attraktiver diese Alternativen für Kunden sind, desto eher können sie dir weglaufen.",
  rivalry:
    "Wie stark konkurrieren die bestehenden Wettbewerber miteinander? Preis, Produkt, Marketing – wie intensiv ist der Kampf um Kunden? Hohe Intensität bedeutet: härterer Wettbewerb für alle im Markt.",
  buyer_power:
    "Wie viel Verhandlungsmacht haben deine Kunden? Können sie Preise drücken oder Konditionen diktieren? Wenige große Kunden haben oft mehr Macht – sie können dich unter Druck setzen. Viele kleine Kunden = weniger Druck auf dich.",
  supplier_power:
    "Wie abhängig bist du von deinen Zulieferern? Können sie Preise diktieren oder leicht wechseln? Wenige starke Lieferanten haben mehr Macht – du bist dann stärker von ihnen abhängig.",
};

export function PorterForceSheetContent({ force }: PorterForceSheetContentProps) {
  const da = force.detailed_analysis;
  const isNewEntrants = force.key === "new_entrants";
  const isSubstitutes = force.key === "substitutes";

  return (
    <>
      <SheetHeader className="pb-4 pr-10">
        <div className="flex items-center gap-2 w-fit">
          <SheetTitle className="text-xl font-semibold pl-4 border-l-4 border-primary/50 text-foreground">
            {force.label}
          </SheetTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Erklärung anzeigen"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-[260px] text-left">
                {FORCE_EXPLANATIONS[force.key] ?? "Erklärung zu diesem Porter-Faktor."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SheetHeader>
      <div className="flex flex-col gap-8 py-6 px-6 overflow-y-auto flex-1 min-h-0">
        {/* Detaillierte Analyse für new_entrants (8-Sektionen-Struktur) */}
        {isNewEntrants && da && !isSubstitutesDetailed(da) ? (
          <div className="space-y-8">
            <Section title="Kurzfazit & Einfluss auf den Wettbewerb">
              <p className="leading-relaxed whitespace-pre-line">
                <TextWithCompanyLinks
                  text={da.short_summary}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <Section title="Zentrale Eintrittsbarrieren">
              <ul className="list-none space-y-4">
                {da.entry_barriers.map((b, i) => (
                  <li key={i}>
                    <Collapsible className="group rounded-lg border bg-muted/20 overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground">{b.name}</span>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                              <TextWithCompanyLinks
                                text={b.rationale}
                                entityLinks={force.entity_links}
                                linkClassName="underline hover:text-foreground text-muted-foreground"
                              />
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-normal",
                                b.strength === "Hoch" &&
                                  "border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
                                b.strength === "Mittel" &&
                                  "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                                b.strength === "Niedrig" &&
                                  "border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                              )}
                            >
                              {b.strength}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        <div className="px-4 pb-4 pt-0 -mt-1 border-t border-border/50">
                          <div className="pt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {b.details && b.details.trim() && b.details.trim() !== b.rationale.trim() ? (
                              <TextWithCompanyLinks
                                text={b.details}
                                entityLinks={force.entity_links}
                                linkClassName="underline hover:text-foreground text-muted-foreground"
                              />
                            ) : (
                              <p className="italic text-muted-foreground/90">
                                Eine detaillierte Vertiefung zu diesem Faktor wird bei einem Refresh der Umfeld-Insights („Porter aktualisieren“) generiert.
                              </p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Potenzielle neue Marktteilnehmer">
              <ul className="list-disc list-inside space-y-2 pl-1">
                {da.potential_new_entrants.map((a, i) => (
                  <li key={i} className="leading-relaxed">
                    <TextWithCompanyLinks
                      text={a}
                      entityLinks={force.entity_links}
                      linkClassName="underline hover:text-foreground text-muted-foreground"
                    />
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Wechselwirkungen mit anderen Porter-Kräften">
              <p>
                <TextWithCompanyLinks
                  text={da.porter_interactions}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <Section title="Frühindikatoren">
              <p>
                <TextWithCompanyLinks
                  text={da.early_indicators}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <div className="space-y-3 rounded-lg border border-border/45 bg-muted/30 p-4">
              <h4 className="font-semibold text-sm">Strategische Implikation</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <TextWithCompanyLinks
                  text={da.strategic_implication}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </div>

            <div className="pt-6 border-t border-border/40">
              <SourcesSection sources={force.sources} />
            </div>
          </div>
        ) : isSubstitutes && da && isSubstitutesDetailed(da) ? (
          /* Detaillierte Analyse für substitutes (9-Sektionen-Struktur) */
          <div className="space-y-8">
            <Section title="Kurzfazit & Einfluss auf den Wettbewerb">
              <p className="leading-relaxed whitespace-pre-line">
                <TextWithCompanyLinks
                  text={da.short_summary}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <Section title="Top-Substitute (priorisiert)">
              <ul className="list-none space-y-4">
                {da.top_substitutes.map((s, i) => (
                  <li key={i} className="rounded-lg border p-4 bg-muted/20">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-foreground">
                        <TextWithCompanyLinks
                          text={s.name}
                          entityLinks={force.entity_links}
                          linkClassName="underline hover:text-foreground"
                        />
                      </span>
                      <Badge variant="outline" className="text-xs font-normal shrink-0">
                        {s.relevanz}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <TextWithCompanyLinks
                        text={s.why_attractive}
                        entityLinks={force.entity_links}
                        linkClassName="underline hover:text-foreground text-muted-foreground"
                      />
                    </p>
                    {s.examples && (
                      <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">
                        Beispiele:{" "}
                        <TextWithCompanyLinks
                          text={s.examples}
                          entityLinks={force.entity_links}
                          linkClassName="underline hover:text-foreground text-muted-foreground"
                        />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Wechseltrigger – Wann wechseln Kunden wirklich?">
              <ul className="list-disc list-inside space-y-2 pl-1">
                {da.switch_triggers.map((t, i) => (
                  <li key={i} className="leading-relaxed">
                    <TextWithCompanyLinks
                      text={t}
                      entityLinks={force.entity_links}
                      linkClassName="underline hover:text-foreground text-muted-foreground"
                    />
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Schutzfaktoren – Warum Kunden nicht wechseln">
              <ul className="list-disc list-inside space-y-2 pl-1">
                {da.protection_factors.map((f, i) => (
                  <li key={i} className="leading-relaxed">
                    <TextWithCompanyLinks
                      text={f}
                      entityLinks={force.entity_links}
                      linkClassName="underline hover:text-foreground text-muted-foreground"
                    />
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Wechselwirkungen mit anderen Porter-Kräften">
              <p>
                <TextWithCompanyLinks
                  text={da.porter_interactions}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <Section title="Frühindikatoren">
              <p>
                <TextWithCompanyLinks
                  text={da.early_indicators}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </Section>

            <div className="space-y-3 rounded-lg border border-border/45 bg-muted/30 p-4">
              <h4 className="font-semibold text-sm">Strategische Implikation</h4>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                <TextWithCompanyLinks
                  text={da.strategic_implication}
                  entityLinks={force.entity_links}
                  linkClassName="underline hover:text-foreground text-muted-foreground"
                />
              </p>
            </div>

            <div className="pt-6 border-t border-border/40">
              <SourcesSection sources={force.sources} />
            </div>
          </div>
        ) : (
          /* Fallback: klassische Darstellung für andere Kräfte oder fehlende detailed_analysis */
          <div className="space-y-8">
            {force.market_actors && force.market_actors.length > 0 && (
              <div className="space-y-3 pb-8 border-b border-border/40">
                <h4 className="font-semibold text-sm">Marktakteure</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <TextWithCompanyLinks
                    text={force.market_actors.join(", ")}
                    entityLinks={force.entity_links}
                    linkClassName="underline hover:text-foreground text-muted-foreground"
                  />
                </p>
              </div>
            )}
            {force.insights && force.insights.length > 0 && (
              <div className="space-y-3 pb-8 border-b border-border/40">
                <h4 className="font-semibold text-sm">Analysepunkte</h4>
                <ul className="list-disc list-inside space-y-2 pl-1 text-sm text-muted-foreground">
                  {force.insights.map((insight, i) => (
                    <li key={i} className="leading-relaxed">
                      <TextWithCompanyLinks
                        text={insight}
                        entityLinks={force.entity_links}
                        linkClassName="underline hover:text-foreground text-muted-foreground"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {force.strategic_insight && (
              <div className="space-y-3 rounded-lg border border-border/45 bg-muted/30 p-4">
                <h4 className="font-semibold text-sm">Strategische Erkenntnis</h4>
                <p className="text-sm leading-relaxed">
                  <TextWithCompanyLinks
                    text={force.strategic_insight}
                    entityLinks={force.entity_links}
                    linkClassName="underline hover:text-foreground text-muted-foreground"
                  />
                </p>
              </div>
            )}

            <div className="pt-6 border-t border-border/40">
              <SourcesSection sources={force.sources} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
