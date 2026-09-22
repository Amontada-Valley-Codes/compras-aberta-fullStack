"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { AnalysisFilters } from "@/features/public-data/public-data";

export function AnalysisPagination({ filters, rowCount, hasNext }: { filters: AnalysisFilters; rowCount: number; hasNext: boolean }) {
  const router = useRouter();
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

  return <div className="analysis-pagination">
    <span className="analysis-pagination-count">{rowCount} {rowCount === 1 ? "registro" : "registros"} nesta página</span>
    <label className="analysis-page-size" htmlFor="analysis-page-size">
      Por página
      <select
        key={filters.pageSize}
        id="analysis-page-size"
        defaultValue={filters.pageSize}
        onChange={(event) => router.push(pageLink(1, Number(event.target.value)), { scroll: false })}
      >
        {[10, 20, 30].map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <nav className="analysis-pagination-nav" aria-label="Paginação das licitações">
      <ul className="analysis-pagination-content">
        <li>{filters.page > 1
          ? <Link className="analysis-pagination-control" href={pageLink(filters.page - 1)} scroll={false} prefetch={false} aria-label="Página anterior"><ChevronLeft /><span>Anterior</span></Link>
          : <span className="analysis-pagination-control is-disabled" aria-disabled="true"><ChevronLeft /><span>Anterior</span></span>}</li>
        {pages.map((page, index) => <Fragment key={page}>
          {index > 0 && page - pages[index - 1] > 1 && <li className="analysis-pagination-gap"><span className="analysis-pagination-ellipsis"><MoreHorizontal aria-hidden="true" /><span className="sr-only">Mais páginas</span></span></li>}
          <li className={page === 1 && filters.page > 2 ? "analysis-pagination-first" : undefined}>{page === filters.page
            ? <span className="analysis-pagination-number is-active" aria-current="page" aria-label={`Página ${page}`}>{page}</span>
            : <Link className="analysis-pagination-number" href={pageLink(page)} scroll={false} prefetch={false} aria-label={`Ir para a página ${page}`}>{page}</Link>}</li>
        </Fragment>)}
        <li>{canGoNext
          ? <Link className="analysis-pagination-control" href={pageLink(filters.page + 1)} scroll={false} prefetch={false} aria-label="Próxima página"><span>Próxima</span><ChevronRight /></Link>
          : <span className="analysis-pagination-control is-disabled" aria-disabled="true"><span>Próxima</span><ChevronRight /></span>}</li>
      </ul>
    </nav>
  </div>;
}
