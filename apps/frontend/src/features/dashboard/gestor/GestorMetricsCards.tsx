import type { ReactNode } from "react";
import { AlertTriangle, CircleDollarSign, Lightbulb, Store, Users } from "lucide-react";
import { count, money, percent } from "@/features/public-data/format";
import type { GestorOverview } from "./gestor-data";
import { enter } from "./GestorStates";

function MetricCard({
  index,
  tone,
  icon,
  label,
  value,
  badge,
  detail,
  children,
}: {
  index: number;
  tone: "blue" | "green" | "gold" | "teal";
  icon: ReactNode;
  label: string;
  value: string;
  badge?: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <article className={`ov-card gs-metric is-${tone} ov-enter`} style={enter(index)}>
      <div className="gs-metric-top">
        <span className="gs-metric-icon">{icon}</span>
        {badge && <em className="gs-metric-badge">{badge}</em>}
      </div>
      <small>{label}</small>
      <b>{value}</b>
      <p>{detail}</p>
      {children}
    </article>
  );
}

const plural = (value: number, one: string, many: string) => `${count(value)} ${value === 1 ? one : many}`;

export function GestorMetricsCards({ data }: { data: GestorOverview }) {
  const { totals, retention, municipalityName, year } = data;
  const t = totals.data;
  const r = retention.data;

  return (
    <section className="gs-metrics" aria-label="Indicadores de impacto econômico">
      <MetricCard
        index={2}
        tone="blue"
        icon={<CircleDollarSign />}
        label="Total em compras homologadas"
        value={t ? money(t.total) : "—"}
        detail={totals.error ?? `${plural(t?.bids ?? 0, "licitação", "licitações")} com vencedor em ${year}, ${plural(t?.suppliers ?? 0, "fornecedor", "fornecedores")}.`}
      />
      <MetricCard
        index={3}
        tone="green"
        icon={<Store />}
        label="Ficou no município"
        value={r ? money(r.local) : "—"}
        badge={r ? `${percent(r.localPercent)} do total` : undefined}
        detail={retention.error ?? `Com ${plural(r?.localSuppliers ?? 0, "empresa sediada", "empresas sediadas")} em ${municipalityName}. Microempresas locais: ${money(r?.localMicro)}.`}
      />
      <MetricCard
        index={4}
        tone="gold"
        icon={<AlertTriangle />}
        label="Termômetro de evasão"
        value={r ? money(r.external) : "—"}
        badge={r ? `${percent(r.externalPercent)} do total` : undefined}
        detail={retention.error ?? `Homologado para empresas de outras cidades.${r && r.unknown > 0 ? ` Sem cidade identificada: ${money(r.unknown)}.` : ""}`}
      >
        {r && r.external > 0 && (
          <p className="gs-metric-tip">
            <Lightbulb aria-hidden="true" />
            Oportunidade para capacitar fornecedores locais e reter mais recursos na cidade.
          </p>
        )}
      </MetricCard>
      <MetricCard
        index={5}
        tone="teal"
        icon={<Users />}
        label="Microempresas vencedoras"
        value={t ? plural(t.micro, "empresa", "empresas") : "—"}
        detail={totals.error ?? (r ? `${count(r.localMicroSuppliers)} ${r.localMicroSuppliers === 1 ? "é sediada" : "são sediadas"} em ${municipalityName}.` : `MEs que venceram licitações em ${year}.`)}
      />
    </section>
  );
}
