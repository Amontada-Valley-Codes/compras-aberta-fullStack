"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Loader2 } from "lucide-react";
import type { AnalysisFilters } from "@/features/public-data/public-data";
import { exportChartsToPdf, type AnalysisExportSummary } from "./export-charts-pdf";

export function AnalysisExportLinks({
  filters,
  summary,
}: {
  filters: AnalysisFilters;
  summary: AnalysisExportSummary;
}) {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  const params = new URLSearchParams({ ano: String(filters.year) });
  if (filters.municipalityIbge) params.set("municipio", filters.municipalityIbge);
  if (filters.natureCode) params.set("natureza", filters.natureCode);

  async function handleExportPdf() {
    setStatus("generating");
    try {
      await exportChartsToPdf(summary);
      setStatus("idle");
    } catch (error) {
      console.error("Falha ao gerar o PDF dos gráficos", error);
      setStatus("error");
    }
  }

  return (
    <details className="analysis-export-menu">
      <summary className="ds-button secondary">
        <Download /> Exportar dados <ChevronDown className="analysis-export-chevron" />
      </summary>
      <div className="analysis-export-options">
        <a href={`/analise/exportar?tipo=pagamentos&${params}`}>Planilha de pagamentos a ME (CSV)</a>
        <button type="button" onClick={handleExportPdf} disabled={status === "generating"}>
          {status === "generating" ? (
            <><Loader2 className="analysis-export-spinner" size={16} /> Gerando PDF…</>
          ) : (
            <><FileText size={16} /> Gráficos em PDF</>
          )}
        </button>
        {status === "error" && (
          <p className="analysis-export-error" role="alert">
            Não foi possível gerar o PDF. Tente novamente.
          </p>
        )}
      </div>
    </details>
  );
}
