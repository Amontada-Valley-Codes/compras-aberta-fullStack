"use client";

import { useId, type ComponentProps } from "react";
import { ArrowDownAZ, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import "./public-table.css";

export function PublicTable({ className = "", ...props }: ComponentProps<"table">) {
  return <table className={`public-data-table ${className}`} {...props} />;
}

export function PublicSortHeader({ children, active, ascending, onClick }: { children: React.ReactNode; active: boolean; ascending: boolean; onClick: () => void }) {
  return <th aria-sort={active ? ascending ? "ascending" : "descending" : "none"}><button type="button" className="analysis-sort-button" onClick={onClick}>{children}<ArrowDownAZ size={16} aria-hidden="true" /></button></th>;
}

export function PublicTablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, label }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void; label: string }) {
  const id = useId();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visible = [...new Set([1, page - 1, page, page + 1, pages])].filter((value) => value > 0 && value <= pages).sort((a, b) => a - b);
  return <div className="analysis-pagination public-table-pagination">
    <p className="analysis-pagination-count">{total ? <>Mostrando <b>{((page - 1) * pageSize + 1).toLocaleString("pt-BR")}</b> a <b>{Math.min(page * pageSize, total).toLocaleString("pt-BR")}</b> de <b>{total.toLocaleString("pt-BR")}</b></> : "Nenhum resultado"}</p>
    <div className="analysis-page-size" role="group" aria-labelledby={id}><span id={id}>Linhas por página</span><div className="analysis-page-size-options">{[10, 20, 30, 0].map((size) => <button type="button" key={size} className={(size || total || 1) === pageSize ? "is-active" : ""} aria-pressed={(size || total || 1) === pageSize} onClick={() => onPageSizeChange(size || total || 1)}>{size || "Todos"}</button>)}</div></div>
    <nav className="analysis-pagination-nav" aria-label={label}><ul className="analysis-pagination-content">
      <li><button type="button" className="analysis-pagination-control" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden="true" /><span>Anterior</span></button></li>
      {visible.map((value, index) => <li key={value} className="public-page-item">{index > 0 && value - visible[index - 1] > 1 && <span className="analysis-pagination-ellipsis"><MoreHorizontal aria-hidden="true" /></span>}<button type="button" className={`analysis-pagination-number${value === page ? " is-active" : ""}`} aria-current={value === page ? "page" : undefined} aria-label={`Página ${value}`} onClick={() => onPageChange(value)}>{value}</button></li>)}
      <li><button type="button" className="analysis-pagination-control" disabled={page === pages} onClick={() => onPageChange(page + 1)}><span>Próxima</span><ChevronRight aria-hidden="true" /></button></li>
    </ul></nav>
  </div>;
}
