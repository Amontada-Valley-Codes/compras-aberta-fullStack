import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { AnalysisFilters } from "@/features/public-data/public-data";
import { LinkPending } from "./LinkPending";

const PAGE_SIZES = [{ value: 10, label: "10" }, { value: 20, label: "20" }, { value: 30, label: "30" }, { value: 100, label: "Todos" }];

export function AnalysisPagination({ filters, rowCount, hasNext }: { filters: AnalysisFilters; rowCount: number; hasNext: boolean }) {
  const pageLink = (page: number, pageSize = filters.pageSize) => {
    const params = new URLSearchParams({ ano: String(filters.year), pagina: String(page), limite: String(pageSize) });
    if (filters.municipalityIbge) params.set("municipio", filters.municipalityIbge);
    if (filters.natureCode) params.set("natureza", filters.natureCode);
    return `/analise?${params.toString()}`;
  };
  const canGoNext = hasNext && filters.page < 1000;
  const pages = [...new Set([1, filters.page - 1, filters.page, ...(canGoNext ? [filters.page + 1] : [])])]
    .filter((page) => page >= 1)
    .sort((a, b) => a - b);
  const firstRow = (filters.page - 1) * filters.pageSize + 1;
  const lastRow = firstRow + rowCount - 1;

  return <div className="analysis-pagination">
    <p className="analysis-pagination-count">
      {rowCount ? <>Mostrando <b>{firstRow.toLocaleString("pt-BR")}</b> a <b>{lastRow.toLocaleString("pt-BR")}</b></> : "Nenhum resultado nesta página"}
    </p>

    {/* Links em vez de <select>: as opções ficam visíveis, um clique troca
        e funciona mesmo antes do JavaScript carregar. Trocar o tamanho volta
        para a página 1, porque a página atual pode deixar de existir. */}
    <div className="analysis-page-size" role="group" aria-labelledby="analysis-page-size-label">
      <span id="analysis-page-size-label">Linhas por página</span>
      <div className="analysis-page-size-options">
        {PAGE_SIZES.map((size) => size.value === filters.pageSize
          ? <span key={size.value} className="is-active" aria-current="true">{size.label}</span>
          : <Link key={size.value} href={pageLink(1, size.value)} scroll={false} prefetch={false} aria-label={`Mostrar ${size.label === "Todos" ? "todas as" : size.label} linhas por página`}>{size.label}<LinkPending /></Link>)}
      </div>
    </div>

    <nav className="analysis-pagination-nav" aria-label="Paginação das licitações">
      <ul className="analysis-pagination-content">
        <li>{filters.page > 1
          ? <Link className="analysis-pagination-control" href={pageLink(filters.page - 1)} scroll={false} prefetch={false} aria-label="Página anterior"><ChevronLeft /><span>Anterior</span><LinkPending /></Link>
          : <span className="analysis-pagination-control is-disabled" aria-disabled="true"><ChevronLeft /><span>Anterior</span></span>}</li>
        {pages.map((page, index) => <Fragment key={page}>
          {index > 0 && page - pages[index - 1] > 1 && <li className="analysis-pagination-gap"><span className="analysis-pagination-ellipsis"><MoreHorizontal aria-hidden="true" /><span className="sr-only">Mais páginas</span></span></li>}
          <li className={page === 1 && filters.page > 2 ? "analysis-pagination-first" : undefined}>{page === filters.page
            ? <span className="analysis-pagination-number is-active" aria-current="page" aria-label={`Página ${page}`}>{page}</span>
            : <Link className="analysis-pagination-number" href={pageLink(page)} scroll={false} prefetch={false} aria-label={`Ir para a página ${page}`}>{page}<LinkPending /></Link>}</li>
        </Fragment>)}
        <li>{canGoNext
          ? <Link className="analysis-pagination-control" href={pageLink(filters.page + 1)} scroll={false} prefetch={false} aria-label="Próxima página"><span>Próxima</span><ChevronRight /><LinkPending /></Link>
          : <span className="analysis-pagination-control is-disabled" aria-disabled="true"><span>Próxima</span><ChevronRight /></span>}</li>
      </ul>
    </nav>
  </div>;
}
