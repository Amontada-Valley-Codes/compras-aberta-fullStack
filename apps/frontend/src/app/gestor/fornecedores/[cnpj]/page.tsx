import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { titleCase } from "@/features/public-data/plain-language";
import {
  CardHead, DataState, GestorMissingMunicipality, OriginTag, PageHeading, enter, gestorQuery,
} from "@/features/dashboard/gestor/GestorStates";
import { loadCompanyDirectory, loadParticipations, loadParticipationsByCnpj } from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { companyCity, formatDateBr, maskCnpj, originOf, yearOf } from "@/features/dashboard/gestor/gestor-domain";

export const metadata: Metadata = {
  title: "Fornecedor | Painel do Gestor | Compras Abertas",
};

export default async function GestorSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ cnpj: rawCnpj }, context] = await Promise.all([params, resolveGestorContext(searchParams)]);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year, municipalityIbge, isAdmin } = context;
  const query = gestorQuery(year, municipalityIbge, isAdmin);
  const cnpj = rawCnpj.replace(/\D/g, "");

  const back = (
    <Link className="gs-back" href={`/gestor/fornecedores?${query}`}><ArrowLeft aria-hidden="true" /> Voltar para os fornecedores</Link>
  );

  if (cnpj.length !== 14) {
    return <main className="gs-main">{back}<DataState error={null} fallback="CNPJ inválido." /></main>;
  }

  const [participations, directory, elsewhere] = await Promise.all([
    loadParticipations(municipality.tceCode).catch(() => null),
    loadCompanyDirectory().catch(() => null),
    loadParticipationsByCnpj(cnpj).catch(() => null),
  ]);

  const company = directory?.get(cnpj);
  const here = (participations ?? [])
    .filter((row) => row.cnpj === cnpj)
    .sort((a, b) => (b.data_realizacao_licitacao ?? "").localeCompare(a.data_realizacao_licitacao ?? ""));

  if (!company && here.length === 0) {
    return (
      <main className="gs-main">
        {back}
        <DataState error={participations ? null : "Não foi possível carregar os dados agora."} fallback="Esta empresa não aparece entre os fornecedores da prefeitura." />
      </main>
    );
  }

  const name = titleCase(company?.razao_social ?? here[0]?.razao_social ?? "Empresa não informada");
  const totalHere = here.reduce((sum, row) => sum + (Number(row.valor_total_vencido) || 0), 0);

  // Por ano, neste município.
  const byYear = new Map<number, { value: number; bids: number }>();
  for (const row of here) {
    const rowYear = yearOf(row.data_realizacao_licitacao);
    if (!rowYear) continue;
    const entry = byYear.get(rowYear) ?? { value: 0, bids: 0 };
    entry.value += Number(row.valor_total_vencido) || 0;
    entry.bids += 1;
    byYear.set(rowYear, entry);
  }
  const years = [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  const maxYearValue = Math.max(1, ...years.map(([, entry]) => entry.value));

  // Em outros municípios do Ceará.
  const others = new Map<string, { name: string; value: number; bids: number }>();
  for (const row of elsewhere ?? []) {
    if (row.codigo_municipio === municipality.tceCode) continue;
    const entry = others.get(row.codigo_municipio) ?? { name: titleCase(row.municipio), value: 0, bids: 0 };
    entry.value += Number(row.valor_total_vencido) || 0;
    entry.bids += 1;
    others.set(row.codigo_municipio, entry);
  }
  const otherList = [...others.values()].sort((a, b) => b.value - a.value);

  return (
    <main className="gs-main">
      {back}
      <PageHeading
        eyebrow="FORNECEDOR"
        title={name}
        summary={company?.nome_fantasia && titleCase(company.nome_fantasia) !== name ? `Nome fantasia: ${titleCase(company.nome_fantasia)}` : undefined}
        actions={<OriginTag origin={originOf(company, municipality.name)} city={companyCity(company)} />}
      />

      <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Dados do fornecedor">
        <div><small>CNPJ</small><b className="gs-stat-text">{maskCnpj(cnpj)}</b><em>{company?.situacao_cadastral ? `Situação: ${company.situacao_cadastral}` : "Situação não informada"}</em></div>
        <div><small>Porte</small><b className="gs-stat-text">{company?.porte_empresa ?? here[0]?.porte_empresa ?? "—"}</b><em>{company?.cnae_principal ? `CNAE ${company.cnae_principal}` : "CNAE não informado"}</em></div>
        <div><small>Cidade</small><b className="gs-stat-text">{companyCity(company) ?? "Não identificada"}</b></div>
        <div><small>Recebeu de {municipality.name}</small><b>{money(totalHere)}</b><em>{count(here.length)} {here.length === 1 ? "licitação" : "licitações"} desde {years.at(-1)?.[0] ?? "—"}</em></div>
      </section>

      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-6 ov-enter" style={enter(2)}>
          <CardHead title="Por ano" subtitle={`Valor homologado para a empresa em ${municipality.name}.`} />
          {years.length === 0 ? (
            <DataState error={null} fallback="Nenhuma licitação vencida nesta prefeitura." />
          ) : (
            <ul className="gs-bars">
              {years.map(([rowYear, entry]) => (
                <li key={rowYear} className={rowYear === year ? "is-current" : ""}>
                  <span>{rowYear}</span>
                  <i aria-hidden="true"><s style={{ width: `${(entry.value / maxYearValue) * 100}%` }} /></i>
                  <b>{money(entry.value)}</b>
                  <small>{count(entry.bids)} {entry.bids === 1 ? "licitação" : "licitações"}</small>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(3)}>
          <CardHead title="Em outros municípios" subtitle="Onde mais esta empresa venceu licitações no Ceará." />
          {!elsewhere ? (
            <DataState error="Não foi possível consultar os outros municípios agora." fallback="" />
          ) : otherList.length === 0 ? (
            <DataState error={null} fallback="A empresa não venceu licitações em outros municípios." />
          ) : (
            <ul className="gs-bars">
              {otherList.slice(0, 8).map((entry) => (
                <li key={entry.name}>
                  <span title={entry.name}>{entry.name}</span>
                  <i aria-hidden="true"><s style={{ width: `${(entry.value / Math.max(1, otherList[0].value)) * 100}%` }} /></i>
                  <b>{money(entry.value)}</b>
                  <small>{count(entry.bids)} {entry.bids === 1 ? "licitação" : "licitações"}</small>
                </li>
              ))}
              {otherList.length > 8 && <li className="gs-bars-more">e mais {count(otherList.length - 8)} municípios</li>}
            </ul>
          )}
        </article>
      </section>

      <article className="ov-card ov-section ov-enter" style={enter(4)}>
        <CardHead title={`Licitações vencidas em ${municipality.name}`} subtitle="Da mais recente para a mais antiga." />
        {here.length === 0 ? (
          <DataState error={null} fallback="Nenhuma licitação vencida nesta prefeitura." />
        ) : (
          <div className="gs-table-scroll">
            <table className="gs-table">
              <thead>
                <tr>
                  <th scope="col">Licitação</th>
                  <th scope="col">Data</th>
                  <th scope="col" className="is-number">Itens vencidos</th>
                  <th scope="col" className="is-number">Valor homologado</th>
                </tr>
              </thead>
              <tbody>
                {here.map((row) => {
                  const rowYear = yearOf(row.data_realizacao_licitacao) ?? year;
                  const rowQuery = gestorQuery(rowYear, municipalityIbge, isAdmin);
                  return (
                    <tr key={`${row.numero_licitacao}-${row.data_realizacao_licitacao}`}>
                      <td><Link className="gs-company-link gs-bid-number" href={`/gestor/licitacoes/detalhe?${rowQuery}&numero=${encodeURIComponent(row.numero_licitacao)}`}>{row.numero_licitacao}</Link></td>
                      <td className="gs-nowrap">{formatDateBr(row.data_realizacao_licitacao)}</td>
                      <td className="is-number">{count(row.quantidade_itens_vencidos)}</td>
                      <td className="is-number"><strong>{money(row.valor_total_vencido)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </main>
  );
}
