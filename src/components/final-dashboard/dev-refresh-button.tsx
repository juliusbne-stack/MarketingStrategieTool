"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { refreshExternalDrivers } from "@/app/actions/external-insight-actions";
import { RefreshCw, Loader2 } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

type RefreshType = "pestel" | "porter" | "both" | null;

interface DevRefreshButtonProps {
  projectId: number;
  searchConfigured?: boolean;
}

export function DevRefreshButton({
  projectId,
  searchConfigured = true,
}: DevRefreshButtonProps) {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<RefreshType>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async (
    force: boolean,
    bypassRateLimitOnly: boolean,
    refreshOnly: "pestel" | "porter" | "both" = "both"
  ) => {
    if (!searchConfigured || loadingType) return;
    setError(null);
    setLoadingType(refreshOnly);
    try {
      const result = await refreshExternalDrivers({
        projectId,
        force,
        bypassRateLimitOnly,
        refreshOnly,
      });
      if (result?.success) {
        router.refresh();
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh fehlgeschlagen");
    } finally {
      setLoadingType(null);
    }
  };

  if (!isDev) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(false, true, "pestel")}
              disabled={!!loadingType || !searchConfigured}
              className="text-xs"
            >
              {loadingType === "pestel" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Umfeld-Insights aktualisieren</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Aktualisiert nur Umfeld-Insights. Nutzt gecachte Suchergebnisse und
            bestehende Artefakte.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(false, true, "porter")}
              disabled={!!loadingType || !searchConfigured}
              className="text-xs"
            >
              {loadingType === "porter" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Porter aktualisieren</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Aktualisiert nur Porter. Nutzt gecachte Suchergebnisse und bestehende
            Artefakte.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(false, true, "both")}
              disabled={!!loadingType || !searchConfigured}
              className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
            >
              {loadingType === "both" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Alle (Cache)</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Nutzt gecachte Suchergebnisse. Keine neuen API-Anfragen. Rate-Limit
            umgangen.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(true, false, "both")}
              disabled={!!loadingType || !searchConfigured}
              className="text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              {loadingType === "both" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Alle (Neu)</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Echte Google-Suchanfragen. Ignoriert Cache und Rate-Limit.
          </TooltipContent>
        </Tooltip>
        {error && (
          <span className="text-xs text-destructive max-w-[200px] truncate">
            {error}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
