import type { Metadata } from "next";
import { AlarmClock } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { titleCase } from "@/features/public-data/plain-language";
import { GestorContractsTable } from "@/features/dashboard/gestor/GestorContractsTable";
import {
  BarList, CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SectionTitle, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { formatDateBr } from "@/features/dashboard/gestor/gestor-domain";
import { contractYears, loadContracts } from "@/features/dashboard/gestor/pncp-api";
import { classifyContracts, contractValueLabel, isCurrent, unitLabel } from "@/features/dashboard/gestor/pncp-domain";

export const metadata: Metadata = {
  title: "Contratos | Painel do Gestor | Compras Abertas",
};

export default async function GestorContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  const result = await loadContracts(municipality.ibgeCode, year).catch(() => null);
  const years = contractYears(year);
  const yearsText = years.length > 1 ? `${years.slice(0, -1).join(", ")} e ${years.at(-1)}` : String(years[0]);
  const rows = result ? classifyContracts(result.rows) : [];
  const current = rows.filter(isCurrent);
  const ending30 = rows.filter((row) => row.status === "ending30");
  const ending90 = rows.filter((row) => row.status === "ending30" || row.status === "ending90");
  const sum = (list: typeof rows) => list.reduce((total, row) => total + row.globalValue, 0);

  const byUnit = new Map<string, { value: number; contracts: number }>();
  for (const row of current) {
    const label = unitLabel(row.unitName);
    const entry = byUnit.get(label) ?? { value: 0, contracts: 0 };
    entry.value += row.globalValue;
    entry.contracts += 1;
    byUnit.set(label, entry);
  }
  const unitItems = [...byUnit.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8)
    .map(([label, entry]) => ({ label, value: entry.value, display: money(entry.value), meta: `${count(entry.contracts)} ${entry.contracts === 1 ? "contrato" : "contratos"}` }));

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`CONTRATOS • ${year}`}
        title={`Contratos de ${municipality.name}`}
        summary="Contratos publicados no PNCP, com a vigência de cada um: o que está valendo, o que vence nos próximos dias e o que já terminou."
      />

      {!result ? (
        <DataState error="Não foi possível consultar os contratos no PNCP agora. Tente novamente em instantes." fallback="" />
      ) : rows.length === 0 ? (
        <DataState error={null} fallback={`Nenhum contrato publicado no PNCP em ${yearsText}.`} />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo dos contratos">
            <div><small>Vigentes hoje</small><b>{count(current.length)}</b><em>{money(sum(current))}</em></div>
            <div className={ending30.length ? "is-alert" : ""}><small>Vencem em até 30 dias</small><b>{count(ending30.length)}</b><em>{money(sum(ending30))}</em></div>
            <div><small>Vencem em até 90 dias</small><b>{count(ending90.length)}</b><em>{money(sum(ending90))}</em></div>
            <div><small>Contratos no período</small><b>{count(rows.length)}</b><em>publicados em {yearsText}</em></div>
          </section>
          {result.failedRequests > 0 && <PartialNotice>O PNCP não respondeu para alguns órgãos; a lista pode estar incompleta.</PartialNotice>}

          {ending90.length > 0 && (
            <>
              <SectionTitle index={2} title="Atenção aos vencimentos" hint="Contratos que terminam nos próximos 90 dias: renovar, aditivar ou preparar nova contratação." />
              <section className="ov-section">
                <ul className="gs-alert-list ov-enter" style={enter(3)}>
                  {ending90.slice(0, 6).map((row) => (
                    <li key={row.controlNumber} className={row.status === "ending30" ? "is-urgent" : ""}>
                      <AlarmClock aria-hidden="true" />
                      <div>
                        <b className="gs-clamp gs-clamp--1" title={row.object}>{row.object}</b>
                        <small>{titleCase(row.supplierName)} • {unitLabel(row.unitName)}</small>
                      </div>
                      <span>
                        <strong>{row.daysLeft === 0 ? "Vence hoje" : `${count(row.daysLeft ?? 0)} ${row.daysLeft === 1 ? "dia" : "dias"}`}</strong>
                        <small>até {formatDateBr(row.endsAt)}</small>
                      </span>
                      <em>{contractValueLabel(row.globalValue, money)}</em>
                    </li>
                  ))}
                </ul>
                {ending90.length > 6 && <p className="gs-note">E mais {count(ending90.length - 6)} contratos vencendo em até 90 dias: veja na lista abaixo, filtro &ldquo;A vencer&rdquo;.</p>}
              </section>
            </>
          )}

          <section className="ov-grid ov-section">
            <article className="ov-card ov-span-12 ov-enter" style={enter(4)}>
              <CardHead title="Contratos vigentes por secretaria" subtitle="Valor global dos contratos que estão valendo hoje." />
              <BarList items={unitItems} emptyText="Nenhum contrato vigente hoje." />
            </article>
          </section>

          <article className="ov-card ov-section ov-enter" style={enter(5)}>
            <CardHead title="Todos os contratos" subtitle="Busque por objeto, fornecedor ou número e filtre pela situação." />
            <GestorContractsTable rows={rows} />
          </article>
        </>
      )}

      <SourceNote>
        Fonte: Portal Nacional de Contratações Públicas (PNCP), contratos publicados em {yearsText} pelos órgãos da prefeitura (Câmara Municipal e órgãos do Estado ficam de fora).
        Contratos mais antigos que continuem vigentes não aparecem. O PNCP não informa valores executados nem saldo; para isso é
        preciso a integração com a contabilidade da prefeitura.
      </SourceNote>
    </main>
  );
}
