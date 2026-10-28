import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { count, money, percent } from "@/features/public-data/format";
import { GestorRetentionChart } from "@/features/dashboard/gestor/GestorRetentionChart";
import {
  BarList, CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SectionTitle, SourceNote, enter, gestorQuery,
} from "@/features/dashboard/gestor/GestorStates";
import { loadCompanyDirectory, loadParticipations } from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { buildSuppliers, participationsOfYear } from "@/features/dashboard/gestor/gestor-domain";
import { loadContracts, loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import { MAX_RESULT_RATIO, MIN_RESULT_RATIO, contractedByProcurement, summarizeSavings, unitLabel } from "@/features/dashboard/gestor/pncp-domain";

export const metadata: Metadata = {
  title: "Ganhos | Painel do Gestor | Compras Abertas",
};

// Economia: depende dos contratos (consulta lenta do PNCP), então carrega à
// parte, depois do dinheiro que ficou na cidade.
async function SavingsSection({ ibge, year }: { ibge: string; year: number }) {
  const [procurements, contracts] = await Promise.all([
    loadProcurements(ibge, year).catch(() => null),
    loadContracts(ibge, year).catch(() => null),
  ]);
  const savings = procurements ? summarizeSavings(procurements.rows, contracts ? contractedByProcurement(contracts.rows) : undefined) : null;
  const savingsBar = (entry: { label: string; savings: number; percent: number; processes: number }) => ({
    label: entry.label,
    value: Math.max(0, entry.savings),
    display: money(entry.savings),
    meta: `${percent(entry.percent)} • ${count(entry.processes)} ${entry.processes === 1 ? "processo" : "processos"}`,
  });

  return (
    <>
      {!savings ? (
        <DataState error="Não foi possível consultar o PNCP agora. Tente novamente em instantes." fallback="" />
      ) : savings.eligible === 0 ? (
        <DataState error={null} fallback="Nenhuma contratação do ano tem resultado publicado no PNCP (valor homologado ou contrato vinculado à compra)." />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(2)} aria-label="Resumo da economia">
            <div className="is-good"><small>Economia</small><b>{money(savings.savings)}</b><em>{percent(savings.percent)} do valor estimado</em></div>
            <div><small>Valor estimado</small><b>{money(savings.estimated)}</b></div>
            <div><small>Resultado</small><b>{money(savings.awarded)}</b><em>homologado ou contratado</em></div>
            <div><small>Processos considerados</small><b>{count(savings.eligible)} de {count(savings.published)}</b><em>{count(savings.byHomologated)} pelo homologado • {count(savings.byContract)} pelos contratos</em></div>
          </section>
          {procurements?.truncated && <PartialNotice>Parte das contratações não pôde ser carregada; a economia é calculada sobre as que foram carregadas.</PartialNotice>}
          {savings.aboveEstimate > 0 && <PartialNotice>{count(savings.aboveEstimate)} {savings.aboveEstimate === 1 ? "processo ficou" : "processos ficaram"} acima do valor estimado (entram na conta como economia negativa).</PartialNotice>}
          {savings.excluded > 0 && <PartialNotice>{count(savings.excluded)} {savings.excluded === 1 ? "processo ficou" : "processos ficaram"} de fora porque o valor contratado não bate com o estimado (abaixo de {percent(MIN_RESULT_RATIO * 100)} ou acima de {percent(MAX_RESULT_RATIO * 100)}), sinal de contratação parcial.</PartialNotice>}

          <section className="ov-grid ov-section">
            <article className="ov-card ov-span-6 ov-enter" style={enter(3)}>
              <CardHead title="Por modalidade" subtitle="Economia em reais e em percentual do estimado." />
              <BarList items={savings.byModality.map(savingsBar)} emptyText="Sem dados." />
            </article>
            <article className="ov-card ov-span-6 ov-enter" style={enter(4)}>
              <CardHead title="Por secretaria" subtitle="Os 8 órgãos com maior economia." />
              <BarList items={savings.byUnit.slice(0, 8).map(savingsBar)} emptyText="Sem dados." />
            </article>
          </section>

          <article className="ov-card ov-section ov-enter" style={enter(5)}>
            <CardHead title="Maiores economias" subtitle="Os 10 processos com maior diferença entre o estimado e o resultado." />
            <div className="gs-table-scroll">
              <table className="gs-table">
                <thead>
                  <tr>
                    <th scope="col">Processo</th>
                    <th scope="col" className="is-number">Estimado</th>
                    <th scope="col" className="is-number">Resultado</th>
                    <th scope="col" className="is-number">Economia</th>
                    <th scope="col"><span className="gs-sr-only">Abrir no PNCP</span></th>
                  </tr>
                </thead>
                <tbody>
                  {savings.top.map((row) => (
                    <tr key={row.controlNumber}>
                      <td>
                        <span className="gs-clamp" title={row.object}>{row.object}</span>
                        <small className="gs-company-meta">{row.modality} • {unitLabel(row.unitName)} • Nº {row.purchaseNumber}</small>
                      </td>
                      <td className="is-number">{money(row.estimated)}</td>
                      <td className="is-number">{money(row.awarded)}</td>
                      <td className="is-number"><strong className="gs-good">{money(row.savings)}</strong><small className="gs-company-meta">{percent(row.percent)}</small></td>
                      <td><a className="gs-row-action" href={row.link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${row.purchaseNumber} no PNCP`}><ExternalLink /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

    </>
  );
}

function SavingsLoading() {
  return (
    <div className="gs-funnel-loading ov-card ov-section" role="status">
      <span className="gs-loading-dot" aria-hidden="true" />
      Calculando a economia com as contratações e os contratos do PNCP… Na primeira consulta do dia isso pode levar alguns minutos.
    </div>
  );
}

export default async function GestorGainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year, municipalityIbge } = context;

  const [participations, directory] = await Promise.all([
    loadParticipations(municipality.tceCode).catch(() => null),
    loadCompanyDirectory().catch(() => null),
  ]);

  const suppliers = participations ? buildSuppliers(participationsOfYear(participations, year), directory, municipality.name) : [];
  const total = suppliers.reduce((sum, supplier) => sum + supplier.total, 0);
  const sumWhere = (filter: (supplier: (typeof suppliers)[number]) => boolean) => suppliers.filter(filter).reduce((sum, supplier) => sum + supplier.total, 0);
  const local = sumWhere((supplier) => supplier.origin === "local");
  const external = sumWhere((supplier) => supplier.origin === "external");
  const retention = directory && total > 0
    ? {
      total,
      local,
      localMicro: sumWhere((supplier) => supplier.origin === "local" && supplier.isMicro),
      external,
      unknown: sumWhere((supplier) => supplier.origin === "unknown"),
      localPercent: (local / total) * 100,
      externalPercent: (external / total) * 100,
    }
    : null;
  const localSuppliers = suppliers.filter((supplier) => supplier.origin === "local").length;

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`GANHOS • ${year}`}
        title={`Ganhos com as licitações em ${year}`}
        summary="Duas formas de ganho: quanto do dinheiro ficou com empresas da própria cidade e quanto a prefeitura economizou na disputa (valor estimado x resultado)."
      />

      <SectionTitle index={1} title="Dinheiro que ficou na cidade" hint={`Valor homologado para empresas sediadas em ${municipality.name}.`} />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-6 ov-enter" style={enter(7)}>
          <CardHead title="Termômetro local x fora" subtitle="Todas as empresas da cidade, de qualquer porte." />
          {retention
            ? <GestorRetentionChart data={retention} municipalityName={municipality.name} />
            : <DataState error={participations && directory ? null : "Não foi possível identificar a cidade dos fornecedores agora."} fallback="Nenhuma compra homologada neste ano." />}
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(8)}>
          <CardHead
            title="Para a economia local"
            subtitle="O que cada parte representa."
            action={<Link className="ov-link" href={`/gestor/fornecedores?${gestorQuery(year, municipalityIbge)}`}>Ver fornecedores <ArrowRight /></Link>}
          />
          {retention ? (
            <ul className="gs-facts">
              <li><b>{money(retention.local)}</b><span>ficaram com {count(localSuppliers)} {localSuppliers === 1 ? "empresa" : "empresas"} de {municipality.name} ({percent(retention.localPercent)} do total).</span></li>
              <li><b>{money(retention.localMicro)}</b><span>desse valor foram para microempresas locais.</span></li>
              <li><b>{money(retention.external)}</b><span>foram para empresas de outras cidades ({percent(retention.externalPercent)}).</span></li>
              <li><b>{money(retention.total)}</b><span>homologados no total em {year}, segundo o TCE-CE.</span></li>
            </ul>
          ) : (
            <DataState error={null} fallback="Sem dados para este ano." />
          )}
        </article>
      </section>

      <SectionTitle index={9} title="Economia nas licitações" hint="Diferença entre o valor estimado no edital e o resultado da disputa." />
      <Suspense fallback={<SavingsLoading />}>
        <SavingsSection ibge={municipality.ibgeCode} year={year} />
      </Suspense>

      <SourceNote>
        O dinheiro que ficou na cidade usa os valores homologados do TCE-CE e a cidade de cada empresa no cadastro da Receita Federal.
        Como a economia é calculada: para cada contratação publicada no PNCP com valor estimado, o resultado é o valor homologado; quando a
        prefeitura não publica o homologado, é a soma dos contratos vinculados àquela compra. Ficam de fora os registros de preços (que
        contratam aos poucos) e os processos cujo contratado fica abaixo de {percent(MIN_RESULT_RATIO * 100)} ou acima de
        {" "}{percent(MAX_RESULT_RATIO * 100)} do estimado. Economia = estimado − resultado; o percentual é sobre o estimado dos processos
        considerados. O estimado é o preço de referência do edital: a economia mostra o resultado da disputa, não uma redução de gasto.
      </SourceNote>
    </main>
  );
}
