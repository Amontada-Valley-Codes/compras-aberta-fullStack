import type { Metadata } from "next";
import { count, money } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";
import { GestorMonthlyChart } from "@/features/dashboard/gestor/GestorMonthlyChart";
import {
  BarList, CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SectionTitle, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { loadParticipations } from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { participationsOfYear } from "@/features/dashboard/gestor/gestor-domain";
import { loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import { spendingBy, unitLabel } from "@/features/dashboard/gestor/pncp-domain";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";

export const metadata: Metadata = {
  title: "Gastos | Painel do Gestor | Compras Abertas",
};

// Elementos de despesa de investimento: obras e equipamentos.
const INVESTMENT_NATURES = new Set(["51", "52"]);

export default async function GestorSpendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  const [procurements, participations, expenses] = await Promise.all([
    loadProcurements(municipality.ibgeCode, year).catch(() => null),
    loadParticipations(municipality.tceCode).catch(() => null),
    listExpensesByNatureService({ codigo_municipio: municipality.tceCode, data_inicio: `${year}-01-01`, data_fim: `${year}-12-31` }).catch(() => null),
  ]);

  const rows = procurements?.rows ?? [];
  const byUnit = spendingBy(rows, (row) => unitLabel(row.unitName));
  const byModality = spendingBy(rows, (row) => row.modality);
  const estimated = rows.reduce((sum, row) => sum + (row.estimated ?? 0), 0);
  const awarded = rows.reduce((sum, row) => sum + (row.awarded ?? 0), 0);

  const monthly = Array.from({ length: 12 }, () => 0);
  for (const row of participationsOfYear(participations ?? [], year)) {
    const month = Number(row.data_realizacao_licitacao?.slice(5, 7));
    if (month >= 1 && month <= 12) monthly[month - 1] += Number(row.valor_total_vencido) || 0;
  }
  const investments = (expenses?.data ?? []).filter((row) => INVESTMENT_NATURES.has(row.codigo_natureza));
  // Muitas prefeituras não publicam o valor homologado no PNCP: nesse caso a
  // barra escura e o texto de homologado somem, em vez de mostrar R$ 0.
  const hasAwarded = awarded > 0;
  const toBar = (entry: ReturnType<typeof spendingBy>[number]) => ({
    label: entry.label,
    value: entry.estimated,
    secondary: hasAwarded ? Math.min(entry.awarded, entry.estimated) : undefined,
    display: money(entry.estimated),
    meta: `${count(entry.processes)} ${entry.processes === 1 ? "processo" : "processos"}${hasAwarded ? ` • ${money(entry.awarded)} homologados` : ""}`,
  });

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`GASTOS E INVESTIMENTOS • ${year}`}
        title={`Gastos com licitações em ${year}`}
        summary="Quanto cada secretaria colocou em licitação, por modalidade, como as compras se distribuíram ao longo do ano e quanto foi para investimentos."
      />

      {!procurements ? (
        <DataState error="Não foi possível consultar o PNCP agora. Tente novamente em instantes." fallback="" />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo dos gastos">
            <div><small>Valor estimado publicado</small><b>{money(estimated)}</b><em>{count(rows.length)} contratações no PNCP</em></div>
            <div><small>Valor homologado</small><b>{hasAwarded ? money(awarded) : "—"}</b><em>{hasAwarded ? "processos com resultado" : "a prefeitura não publica o homologado no PNCP"}</em></div>
            <div><small>Secretarias e órgãos</small><b>{count(byUnit.length)}</b></div>
            <div><small>Investimentos (obras e equipamentos)</small><b>{investments.length ? money(investments.reduce((sum, row) => sum + Number(row.valor_total_dotacao), 0)) : "—"}</b><em>{investments.length ? "dotação prevista" : "aguardando dotações da fonte"}</em></div>
          </section>
          {procurements.truncated && <PartialNotice>Parte das contratações não pôde ser carregada; os valores por secretaria e modalidade são parciais.</PartialNotice>}
        </>
      )}

      <SectionTitle index={2} title="Por secretaria e modalidade" hint={hasAwarded ? "Barra clara: valor estimado. Barra escura: valor já homologado." : "Valor estimado das contratações publicadas."} />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-6 ov-enter" style={enter(3)}>
          <CardHead title="Por secretaria" subtitle="Valor estimado das contratações publicadas por cada órgão." />
          <BarList items={byUnit.slice(0, 10).map(toBar)} emptyText="Nenhuma contratação publicada no ano." />
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(4)}>
          <CardHead title="Por modalidade" subtitle="Pregão, dispensa, inexigibilidade e as demais." />
          <BarList items={byModality.map(toBar)} emptyText="Nenhuma contratação publicada no ano." />
        </article>
      </section>

      <SectionTitle index={5} title="Ao longo do ano e investimentos" hint="Valores homologados por mês (TCE-CE) e dotações de investimento." />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-6 ov-enter" style={enter(6)}>
          <CardHead title="Compras por mês" subtitle="Valor homologado por mês de realização da licitação." />
          {monthly.some((value) => value > 0)
            ? <GestorMonthlyChart values={monthly} />
            : <DataState error={participations ? null : "Não foi possível carregar os valores mensais."} fallback="Nenhuma compra homologada neste ano." />}
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(7)}>
          <CardHead title="Investimentos" subtitle="Dotação prevista para obras e instalações e para equipamentos e material permanente." />
          {investments.length ? (
            <BarList
              items={investments.map((row) => ({ label: natureLabel(row.codigo_natureza, row.nome_natureza), value: Number(row.valor_total_dotacao), display: money(row.valor_total_dotacao), meta: `${count(row.quantidade_licitacoes)} licitações` }))}
              emptyText=""
            />
          ) : (
            <DataState error={expenses ? null : "Não foi possível carregar as dotações."} fallback="A fonte de dados (TCE-CE) ainda não publicou as dotações deste ano. Os investimentos aparecem aqui assim que forem publicados." />
          )}
        </article>
      </section>

      <SourceNote>
        Fontes: PNCP (contratações por secretaria e modalidade, valor estimado e homologado) e TCE-CE (valores mensais e dotações).
        Valor estimado é o previsto no edital; homologado é o resultado da disputa. Nenhuma das fontes informa valores empenhados ou pagos.
      </SourceNote>
    </main>
  );
}
