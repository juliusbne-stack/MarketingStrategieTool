"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * Shown when SEARCH_PROVIDER or SEARCH_API_KEY is not configured.
 * Displays setup steps for enabling Web-Recherche (Serper/Brave).
 */
export function SearchSetupBox() {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="py-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">
              Web-Recherche ist noch nicht aktiviert
            </h3>
            <p className="text-sm text-muted-foreground">
              Um Umfeld-Insights mit aktuellen Web-Quellen zu aktualisieren,
              konfiguriere einen Such-Provider in der Umgebung.
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  SEARCH_PROVIDER=serper
                </code>{" "}
                oder{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  brave
                </code>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  SEARCH_API_KEY=dein-api-schluessel
                </code>
              </li>
              <li>Server neu starten (z.B. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run dev</code>)</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Serper:{" "}
              <a
                href="https://serper.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                serper.dev
              </a>
              {" · "}
              Brave:{" "}
              <a
                href="https://brave.com/search/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                brave.com/search/api
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
