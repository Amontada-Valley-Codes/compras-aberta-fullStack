import type { CSSProperties, ReactNode } from "react";
import { Info, MapPinOff, SearchX } from "lucide-react";
import type { SupplierOrigin } from "./gestor-domain";
import { ORIGIN_LABEL } from "./gestor-domain";

// Peças visuais comuns às páginas de /gestor (sem estado: servem tanto para
// componentes do servidor quanto do cliente).

export const enter = (index: number) => ({ "--i": index }) as CSSProperties;

// Mantém o recorte (ano e, para o administrador, o município) nos links.
export function gestorQuery(year: number, municipalityIbge: string): string {
  return new URLSearchParams({ ano: String(year), municipio: municipalityIbge }).toString();
}

export function PageHeading({ eyebrow, title, summary, actions }: { eyebrow: string; title: string; summary?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="ov-heading gs-heading ov-enter" style={enter(0)}>
      <div>
        <span className="ov-eyebrow"><i aria-hidden="true" /> {eyebrow}</span>
        <h1>{title}</h1>
        {summary && <p className="ov-summary">{summary}</p>}
      </div>
      {actions && <div className="ov-heading-actions">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ index, title, hint }: { index: number; title: string; hint: string }) {
  return (
    <div className="ov-section-title ov-enter" style={enter(index)}>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}

export function CardHead({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="ov-card-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function DataState({ error, fallback }: { error: string | null; fallback: string }) {
  return (
    <div className="gs-state" role="status">
      <SearchX aria-hidden="true" />
      <strong>{error ? "Não foi possível carregar estes dados" : "Nenhum dado encontrado"}</strong>
      <span>{error ?? fallback}</span>
    </div>
  );
}

export function OriginTag({ origin, city }: { origin: SupplierOrigin; city?: string | null }) {
  return (
    <span className={`gs-origin is-${origin}`} title={origin === "unknown" ? "A cidade desta empresa não está no cadastro da fonte de dados." : city ?? undefined}>
      {origin === "local" ? "🏢 " : ""}{ORIGIN_LABEL[origin]}
      {origin === "external" && city && <small>{city}</small>}
    </span>
  );
}

// Lista de barras horizontais (por secretaria, modalidade, categoria…).
// `secondary` desenha uma segunda barra por cima (ex.: homologado sobre o estimado).
export interface BarListItem {
  label: string;
  value: number;
  display: string;
  meta?: string;
  secondary?: number;
}

export function BarList({ items, max, emptyText }: { items: BarListItem[]; max?: number; emptyText: string }) {
  if (items.length === 0) return <DataState error={null} fallback={emptyText} />;
  const top = Math.max(1, max ?? Math.max(...items.map((item) => item.value)));
  return (
    <ul className="gs-bars">
      {items.map((item) => (
        <li key={item.label}>
          <span title={item.label}>{item.label}</span>
          <i aria-hidden="true">
            <s style={{ width: `${(item.value / top) * 100}%` }} />
            {item.secondary !== undefined && <s className="is-secondary" style={{ width: `${(item.secondary / top) * 100}%` }} />}
          </i>
          <b>{item.display}</b>
          {item.meta && <small>{item.meta}</small>}
        </li>
      ))}
    </ul>
  );
}

export function PartialNotice({ children }: { children: ReactNode }) {
  return <p className="gs-partial" role="note">{children}</p>;
}

export function SourceNote({ children }: { children: ReactNode }) {
  return (
    <p className="gs-footnote">
      <Info aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function GestorMissingMunicipality() {
  return (
    <main className="gs-main">
      <section className="ov-card gs-notice" role="alert">
        <MapPinOff aria-hidden="true" />
        <h1>Município não identificado</h1>
        <p>Não conseguimos carregar a lista de municípios ou o município escolhido não foi encontrado. Tente novamente em instantes.</p>
      </section>
    </main>
  );
}
