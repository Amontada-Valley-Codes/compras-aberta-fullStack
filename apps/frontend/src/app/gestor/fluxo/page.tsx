import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { count, money, percent } from "@/features/public-data/format";
import { GestorFlowBreakdown } from "@/features/dashboard/gestor/GestorFlowBreakdown";
import {
  CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SectionTitle, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { yearOf } from "@/features/dashboard/gestor/gestor-domain";
import { loadContracts, loadPlan, loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import { buildFlowBreakdown, contractedByProcurement } from "@/features/dashboard/gestor/pncp-domain";

export const metadata: Metadata = {
  title: "Fluxo das licitações | Painel do Gestor | Compras Abertas",
};

// Situação do dinheiro e funil dependem das consultas mais lentas do PNCP (contratos e
// PCA): carregam à parte, com um aviso enquanto isso.
async function FlowSections({ ibge, year }: { ibge: string; year: number }) {
  const [procurements, contracts, plan] = await Promise.all([
    loadProcurements(ibge, year).catch(() => null),
    loadContracts(ibge, year).catch(() => null),
    loadPlan(ibge, year).catch(() => null),
  ]);
  if (!procurements) return <DataState error="Não foi possível consultar o PNCP agora. Tente novamente em instantes." fallback="" />;

  const contracted = contracts ? contractedByProcurement(contracts.rows) : undefined;
  const flow = buildFlowBreakdown(procurements.rows, contracted);
  const rows = procurements.rows;
  const withResult = rows.filter((row) => (row.awarded ?? 0) > 0 || contracted?.has(row.controlNumber));
  const resultValue = withResult.reduce((sum, row) => sum + ((row.awarded ?? 0) > 0 ? row.awarded! : contracted?.get(row.controlNumber) ?? 0), 0);
  const signed = (contracts?.rows ?? []).filter((row) => yearOf(row.signedAt) === year);

  const steps = [
    { label: "Planejado no PCA", amount: plan ? plan.items.reduce((sum, item) => sum + item.total, 0) : null, detail: plan ? `${count(plan.items.length)} itens planejados` : "PCA indisponível" },
    { label: "Publicado no PNCP", amount: rows.reduce((sum, row) => sum + (row.estimated ?? 0), 0), detail: `${count(rows.length)} contratações (valor estimado)` },
    { label: "Com resultado", amount: contracts ? resultValue : null, detail: contracts ? `${count(withResult.length)} contratações homologadas ou com contrato` : "Contratos indisponíveis" },
    { label: "Contratos assinados no ano", amount: contracts ? signed.reduce((sum, row) => sum + row.globalValue, 0) : null, detail: contracts ? `${count(signed.length)} contratos, inclusive de compras de anos anteriores` : "Contratos indisponíveis" },
  ];
  const max = Math.max(1, ...steps.map((step) => step.amount ?? 0));

  return (
    <>
      {procurements.truncated && <PartialNotice>Parte das contratações não pôde ser carregada; os valores são parciais.</PartialNotice>}
      <article className="ov-card ov-section ov-enter" style={enter(1)}>
        <CardHead title="Onde está o dinheiro das licitações" subtitle="Valor estimado das contratações publicadas no ano e em que situação cada parte está." />
        {flow.total > 0 ? <GestorFlowBreakdown data={flow} /> : <DataState error={null} fallback="Nenhuma contratação com valor publicada no ano." />}
      </article>

      <SectionTitle index={2} title="Do planejamento ao contrato" hint="Quanto do que foi planejado chegou a cada etapa no ano." />
      <article className="ov-card ov-section ov-enter" style={enter(3)}>
        <ol className="gs-funnel">
          {steps.map((step, index) => {
            const previous = index > 0 ? steps[index - 1].amount : null;
            return (
              <li key={step.label} style={{ "--w": `${Math.max(18, ((step.amount ?? 0) / max) * 100)}%` } as CSSProperties}>
                <div className="gs-funnel-bar"><span>{index + 1}</span></div>
                <div className="gs-funnel-text">
                  <small>{step.label}</small>
                  <b>{step.amount === null ? "—" : money(step.amount)}</b>
                  <em>{step.detail}</em>
                </div>
                {index > 0 && index < 3 && previous && step.amount !== null ? (
                  <span className="gs-funnel-rate"><ArrowRight aria-hidden="true" /> {percent((step.amount / previous) * 100)} da etapa anterior</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </article>
    </>
  );
}

function FlowLoading() {
  return (
    <div className="gs-funnel-loading ov-card ov-section" role="status">
      <span className="gs-loading-dot" aria-hidden="true" />
      Consultando contratações, contratos e o PCA no PNCP… Na primeira consulta do dia isso pode levar alguns minutos.
    </div>
  );
}

export default async function GestorFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`FLUXO DAS LICITAÇÕES • ${year}`}
        title={`Fluxo das licitações de ${municipality.name}`}
        summary="Quanto cada secretaria colocou em licitação no ano e quanto disso já virou contrato. Abaixo, o ciclo do planejamento até o contrato."
      />

      <Suspense fallback={<FlowLoading />}>
        <FlowSections ibge={municipality.ibgeCode} year={year} />
      </Suspense>

      <SourceNote>
        Fonte: PNCP, só órgãos da prefeitura (Câmara Municipal e órgãos do Estado ficam de fora). O valor de cada contratação é o estimado
        no edital. &ldquo;Contratado&rdquo; = tem contrato publicado vinculado à compra; &ldquo;Homologado&rdquo; = tem valor homologado
        publicado, sem contrato ainda; &ldquo;Sem resultado publicado&rdquo; reúne processos em andamento e os que ainda não tiveram resultado registrado no portal.
        Contratos assinados no ano podem vir de compras de anos anteriores, por isso essa etapa não é comparada com a anterior.
      </SourceNote>
    </main>
  );
}
