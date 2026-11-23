import type { ReactNode } from "react";
import { BarChart3, Info, Table2 } from "lucide-react";
import { compactMoney, money } from "@/features/public-data/format";

/** Blocos visuais compartilhados pelas telas do gestor público. */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="gp-page-heading"><div>{eyebrow && <span className="gp-eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="gp-heading-actions">{actions}</div>}</header>;
}

export function Card({ title, description, children, className = "", actions }: { title: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return <section className={`gp-card ${className}`}><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header>{children}</section>;
}

export function AnalysisCard({ title, description, children, actions, className = "" }: { title: string; description: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <article className={`analysis-chart-card ${className}`}><header><div><h2>{title}</h2><p>{description}</p></div>{actions}</header>{children}</article>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="gp-empty" role="status"><Info size={19} aria-hidden="true" /><span>{children}</span></div>;
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="gp-source-note"><Info size={15} aria-hidden="true" /><span>{children}</span></p>;
}

type PublicKpiProps = {
  icon: ReactNode;
  label: string;
  detail: string;
  accent?: boolean;
  className?: string;
} & ({ value: string; amount?: never } | { amount: number | null | undefined; value?: never });

export function PublicKpi(props: PublicKpiProps) {
  const { icon, label, value, detail, accent = false, className = "" } = props;
  const monetary = "amount" in props;
  const fullValue = monetary ? money(props.amount) : undefined;
  return <article className={[accent ? "accent" : "", className].filter(Boolean).join(" ")}><div><span>{icon}</span><small>{label}</small></div><strong title={fullValue} aria-label={fullValue}>{monetary ? compactMoney(props.amount) : value}</strong><p>{detail}</p></article>;
}

/** Alternância Gráfico/Tabela no mesmo formato usado nos gráficos públicos. */
export function ChartViewControls({ table, onTableChange, label }: { table: boolean; onTableChange: (value: boolean) => void; label: string }) {
  return <div className="analysis-chart-controls" role="group" aria-label={`Visualização: ${label}`}>
    <button type="button" className={!table ? "is-active" : ""} onClick={() => onTableChange(false)} aria-pressed={!table}><BarChart3 size={15} aria-hidden="true" /> <span>Gráfico</span></button>
    <button type="button" className={table ? "is-active" : ""} onClick={() => onTableChange(true)} aria-pressed={table}><Table2 size={15} aria-hidden="true" /> <span>Tabela</span></button>
  </div>;
}
