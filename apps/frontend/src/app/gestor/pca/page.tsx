import type { Metadata } from "next";
import { count, money, percent } from "@/features/public-data/format";
import { GestorPlanTable } from "@/features/dashboard/gestor/GestorPlanTable";
import {
  BarList, CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { loadPlan, loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import { planBy, planExecution } from "@/features/dashboard/gestor/pncp-domain";

export const metadata: Metadata = {
  title: "PCA | Painel do Gestor | Compras Abertas",
};

// A tabela recebe no máximo estes itens (os de maior valor), para a página
// não ficar pesada em municípios grandes.
const MAX_TABLE_ITEMS = 2000;

export default async function GestorPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  const [plan, procurements] = await Promise.all([
    loadPlan(municipality.ibgeCode, year).catch(() => null),
    loadProcurements(municipality.ibgeCode, year).catch(() => null),
  ]);

  const items = plan?.items ?? [];
  const planned = items.reduce((sum, item) => sum + item.total, 0);
  const execution = planExecution(items, procurements?.rows ?? []);
  const published = execution.reduce((sum, entry) => sum + entry.published, 0);
  const tableItems = [...items].sort((a, b) => b.total - a.total).slice(0, MAX_TABLE_ITEMS);

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`PCA • ${year}`}
        title={`Plano de Contratações ${year}`}
        summary="O que cada secretaria planejou comprar no ano (Plano de Contratações Anual, Lei 14.133/2021) e quanto disso já virou contratação publicada."
      />

      {!plan ? (
        <DataState error="Não foi possível consultar o PCA no PNCP agora. Tente novamente em instantes." fallback="" />
      ) : items.length === 0 ? (
        <DataState error={null} fallback={`Nenhum órgão de ${municipality.name} publicou PCA de ${year} no PNCP.`} />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo do PCA">
            <div><small>Itens planejados</small><b>{count(items.length)}</b></div>
            <div><small>Valor planejado</small><b>{money(planned)}</b></div>
            <div><small>Órgãos com PCA</small><b>{count(plan.agenciesWithPlan)} de {count(plan.agencies)}</b><em>que publicam no PNCP</em></div>
            <div><small>Já publicado</small><b>{planned > 0 ? percent((published / planned) * 100) : "—"}</b><em>{money(published)} em contratações</em></div>
          </section>
          {plan.agenciesWithPlan < plan.agencies && (
            <PartialNotice>{count(plan.agencies - plan.agenciesWithPlan)} órgãos do município não publicaram PCA de {year} no PNCP; o que eles compram não entra no plano.</PartialNotice>
          )}

          <section className="ov-grid ov-section">
            <article className="ov-card ov-span-6 ov-enter" style={enter(2)}>
              <CardHead title="Por categoria" subtitle="Valor planejado em cada tipo de compra." />
              <BarList
                items={planBy(items, (item) => item.category).map((entry) => ({ label: entry.label, value: entry.total, display: money(entry.total), meta: `${count(entry.items)} itens` }))}
                emptyText="Sem categorias informadas."
              />
            </article>
            <article className="ov-card ov-span-6 ov-enter" style={enter(3)}>
              <CardHead title="Planejado x publicado" subtitle="Por órgão: valor do PCA (barra clara) e valor estimado já publicado em contratações (barra escura)." />
              <BarList
                items={execution.map((entry) => ({
                  label: entry.label,
                  value: entry.planned,
                  secondary: Math.min(entry.published, entry.planned),
                  display: money(entry.planned),
                  meta: entry.percent === null ? "—" : `${percent(entry.percent)} publicado`,
                }))}
                emptyText="Sem dados por órgão."
              />
            </article>
          </section>

          <article className="ov-card ov-section ov-enter" style={enter(4)}>
            <CardHead title="Itens do plano" subtitle={items.length > MAX_TABLE_ITEMS ? `Os ${count(MAX_TABLE_ITEMS)} itens de maior valor, de ${count(items.length)}.` : "Busque um item ou filtre pela categoria."} />
            <GestorPlanTable items={tableItems} />
          </article>
        </>
      )}

      <SourceNote>
        Fonte: Plano de Contratações Anual publicado no PNCP. &ldquo;Já publicado&rdquo; compara o valor planejado com o valor estimado
        das contratações que o mesmo órgão publicou em {year}; um item pode ser comprado em mais de uma contratação, então o percentual
        é uma referência, não um acompanhamento item a item.
      </SourceNote>
    </main>
  );
}
