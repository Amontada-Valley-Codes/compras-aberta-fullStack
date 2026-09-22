import { ChevronDown, Download } from "lucide-react";
import type { AnalysisFilters } from "@/features/public-data/public-data";

export function AnalysisExportLinks({ filters }: { filters: AnalysisFilters }) {
  const params = new URLSearchParams({ ano: String(filters.year) });
  if (filters.municipalityIbge) params.set("municipio", filters.municipalityIbge);
  if (filters.natureCode) params.set("natureza", filters.natureCode);

  return <details className="analysis-export-menu">
    <summary className="ds-button secondary"><Download /> Exportar dados <ChevronDown className="analysis-export-chevron" /></summary>
    <div className="analysis-export-options">
      <a href={`/analise/exportar?tipo=licitacoes&${params}`}>Lista completa de licitações</a>
      <a href={`/analise/exportar?tipo=indicadores&${params}`}>Dados dos gráficos</a>
    </div>
  </details>;
}
