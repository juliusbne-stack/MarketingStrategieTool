"use client";

import dynamic from "next/dynamic";
import type { ExternalInsightMeta } from "@/app/actions/external-insight-actions";
import type { Artifact } from "./types";

const ResultsDashboard = dynamic(
  () =>
    import("./results-dashboard").then((m) => ({
      default: m.ResultsDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-sm text-muted-foreground">
        Situationsanalyse wird geladen…
      </div>
    ),
  }
);

export type Phase1ResultsDashboardLoaderProps = {
  artifacts: Artifact[];
  isLocked?: boolean;
  showStrategyProfile?: boolean;
  projectId?: number;
  externalInsightMeta?: ExternalInsightMeta | null;
};

export function Phase1ResultsDashboardLoader(props: Phase1ResultsDashboardLoaderProps) {
  return <ResultsDashboard {...props} />;
}
