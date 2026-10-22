import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { money, percent } from "@/features/public-data/format";
import { GestorMetricsCards } from "./gestor/GestorMetricsCards";
import { GestorMonthlyChart } from "./gestor/GestorMonthlyChart";
import { GestorRetentionChart } from "./gestor/GestorRetentionChart";
import { GestorSpendingChart } from "./gestor/GestorSpendingChart";
import { GestorSuppliersTable } from "./gestor/GestorSuppliersTable";
import { CardHead, DataState, PageHeading, SectionTitle, enter, gestorQuery } from "./gestor/GestorStates";
import type { GestorOverview } from "./gestor/gestor-data";

// Resumo em uma frase, logo abaixo do título (o que o prefeito lê primeiro).
function summaryText({ totals, retention, year, municipalityName }: GestorOverview): string {
  if (totals.error) return "Não foi possível carregar o resumo das compras deste ano.";
  if (!totals.data || totals.data.total === 0) return `Ainda não há compras homologadas em ${municipalityName} em ${year}.`;
  const base = `Em ${year}, a prefeitura homologou ${money(totals.data.total)} em compras.`;
  return retention.data
    ? `${base} ${percent(retention.data.localPercent)} desse valor ficou com empresas de ${municipalityName}.`
    : base;
}

export function GestorDashboard({ data, municipalityIbge, isAdmin }: { data: GestorOverview; municipalityIbge: string; isAdmin: boolean }) {
  const { year, municipalityName, retention, monthly, expenses, suppliers } = data;
  const query = gestorQuery(year, municipalityIbge, isAdmin);
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Fortaleza" }).format(new Date());
  const hasMonthly = Boolean(monthly.data?.some((value) => value > 0));

  return (
    <main className="gs-main">
      <p className="gs-print-only gs-print-meta">Relatório executivo • Compras Abertas • Gerado em {generatedAt}</p>

      <PageHeading eyebrow={`PAINEL DO GESTOR PÚBLICO • ${year}`} title={`Prefeitura de ${municipalityName}`} summary={summaryText(data)} />

      <SectionTitle index={1} title="Impacto econômico" hint="Quanto foi comprado e quanto ficou na economia da cidade." />
      <div className="ov-section">
        <GestorMetricsCards data={data} />
      </div>

      <SectionTitle index={6} title="Para onde vai o dinheiro" hint="Passe o mouse nos gráficos para ver os detalhes." />
      <section className="ov-grid ov-section gs-charts">
        <article className="ov-card ov-span-6 ov-enter" style={enter(7)}>
          <CardHead title="Termômetro local x fora" subtitle={`Parte do valor homologado que ficou com empresas sediadas em ${municipalityName}.`} />
          {retention.data && retention.data.total > 0
            ? <GestorRetentionChart data={retention.data} municipalityName={municipalityName} />
            : <DataState error={retention.error} fallback="Nenhuma compra homologada neste ano." />}
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(8)}>
          <CardHead title="Compras ao longo do ano" subtitle="Valor homologado por mês de realização da licitação." />
          {hasMonthly && monthly.data
            ? <GestorMonthlyChart values={monthly.data} />
            : <DataState error={monthly.error} fallback="Nenhuma compra homologada neste ano." />}
        </article>
        <article className="ov-card ov-span-12 ov-enter" style={enter(9)}>
          <CardHead title="Onde a prefeitura mais gasta" subtitle="Dotação prevista no orçamento para cada tipo de compra." />
          {expenses.data?.length
            ? <GestorSpendingChart data={expenses.data} />
            : <DataState error={expenses.error} fallback="A fonte de dados ainda não publicou as dotações (tipos de compra) deste ano." />}
        </article>
      </section>

      <SectionTitle index={10} title="Fornecedores" hint="Quem mais forneceu para a prefeitura no ano." />
      <section className="ov-section">
        <article className="ov-card gs-suppliers ov-enter" style={enter(11)}>
          <CardHead
            title="Principais fornecedores da prefeitura"
            subtitle={suppliers.data?.total
              ? `As ${Math.min(10, suppliers.data.total)} empresas com maior valor homologado em ${year}, de ${suppliers.data.total} fornecedores.`
              : `Empresas com maior valor homologado em ${year}.`}
            action={<Link className="ov-link gs-no-print" href={`/gestor/fornecedores?${query}`}>Ver todos os fornecedores <ArrowRight /></Link>}
          />
          {suppliers.data?.rows.length ? (
            <>
              <p className="gs-insight">
                Os 5 maiores fornecedores ficaram com <strong>{percent(suppliers.data.top5Share)}</strong> de todo o valor homologado no ano.
              </p>
              <GestorSuppliersTable rows={suppliers.data.rows} query={query} showCategory={suppliers.data.hasCategories} />
            </>
          ) : (
            <DataState error={suppliers.error} fallback="Nenhuma empresa vencedora encontrada neste ano." />
          )}
        </article>
      </section>

      <p className="gs-footnote">
        <Info aria-hidden="true" />
        <span>
          Fonte: dados públicos de licitações do TCE-CE, pela API Compra Aberta. &ldquo;Ficou no município&rdquo; soma o valor
          homologado para empresas sediadas na cidade, de qualquer porte, conforme o cadastro da Receita Federal. Os gastos por
          tipo de compra são dotações previstas no orçamento, não pagamentos efetivos.
        </span>
      </p>
    </main>
  );
}
