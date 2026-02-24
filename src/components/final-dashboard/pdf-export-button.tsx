"use client";

import React, { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportStrategyPdf } from "@/app/actions/pdf-export-actions";
import { FileDown } from "lucide-react";

interface PdfExportButtonProps {
  projectId: number;
}

export function PdfExportButton({ projectId }: PdfExportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = React.useState<{ fileUrl: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleExport() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await exportStrategyPdf({ projectId });
        if (res.success && res.fileUrl) {
          setResult({ fileUrl: res.fileUrl });
        } else {
          setError("Export fehlgeschlagen");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export fehlgeschlagen");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isPending}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {isPending ? "Exportiere..." : "PDF exportieren"}
      </Button>
      {result && (
        <a
          href={result.fileUrl}
          download
          className="text-sm text-primary hover:underline"
        >
          PDF herunterladen
        </a>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
