import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { titleCase } from "@/features/public-data/plain-language";
import {
  CardHead, DataState, GestorMissingMunicipality, OriginTag, PageHeading, enter, gestorQuery,
} from "@/features/dashboard/gestor/GestorStates";
import {
  ApiNotFoundError, loadBidItems, loadBids, loadCompanyDirectory, loadParticipations, type ApiBidItem,
} from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { buildBids, companyCity, formatDateBr, maskCnpj, originOf } from "@/features/dashboard/gestor/gestor-domain";

export const metadata: Metadata = {
  title: "Licitação | Painel do Gestor | Compras Abertas",
};

const MAX_ITEMS = 500;

const quantity = (value: string) =>
  Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const unitMoney = (value: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value) || 0);

export default async function GestorBidDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const context = await resolveGestorContext(Promise.resolve(params));
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year, municipalityIbge, isAdmin } = context;
  const query = gestorQuery(year, municipalityIbge, isAdmin);
  const number = typeof params.numero === "string" ? params.numero.trim().slice(0, 80) : "";

  const back = (
    <Link className="gs-back" href={`/gestor/licitacoes?${query}`}><ArrowLeft aria-hidden="true" /> Voltar para as licitações</Link>
  );

  if (!number) {
    return <main className="gs-main">{back}<DataState error={null} fallback="Escolha uma licitação na lista." /></main>;
  }

  const [bids, participations, directory, itemsResult] = await Promise.all([
    loadBids(municipality.tceCode, year).catch(() => null),
    loadParticipations(municipality.tceCode).catch(() => null),
    loadCompanyDirectory().catch(() => null),
    loadBidItems(municipality.tceCode, number)
      .then((items) => ({ items, error: null as string | null, unavailable: null as string | null }))
      .catch((error: unknown) => (error instanceof ApiNotFoundError || number.includes("/")
        ? { items: [] as ApiBidItem[], error: null, unavailable: "A fonte de dados não disponibiliza os itens de licitações com “/” no número." }
        : { items: [] as ApiBidItem[], error: "Não foi possível carregar os itens agora. Tente novamente em instantes.", unavailable: null })),
  ]);

  const bidRows = buildBids(
    (bids ?? []).filter((bid) => bid.numero_licitacao === number),
    (participations ?? []).filter((row) => row.numero_licitacao === number),
    directory,
    municipality.name,
  );
  const bid = bidRows[0];
  const items = [...itemsResult.items].sort((a, b) => a.numero_sequencial_item_licitacao - b.numero_sequencial_item_licitacao);

  if (!bid && items.length === 0) {
    return (
      <main className="gs-main">
        {back}
        <DataState error={null} fallback={`A licitação ${number} não foi encontrada em ${year} para ${municipality.name}.`} />
      </main>
    );
  }

  return (
    <main className="gs-main">
      {back}
      <PageHeading
        eyebrow={`LICITAÇÃO • ${municipality.name.toUpperCase()}`}
        title={`Licitação nº ${number}`}
        summary={bid ? `Realizada em ${formatDateBr(bid.date)}.` : undefined}
      />

      {bid && (
        <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo da licitação">
          <div><small>Valor total</small><b>{money(bid.value)}</b></div>
          <div><small>Itens</small><b>{count(bid.items)}</b></div>
          <div><small>Empresas vencedoras</small><b>{count(bid.winners.length || bid.companies)}</b></div>
          <div>
            <small>Vencedor da cidade</small>
            <b>{bid.hasLocalWinner ? "Sim" : "Não"}</b>
          </div>
        </section>
      )}

      {bid && bid.winners.length > 0 && (
        <article className="ov-card ov-section ov-enter" style={enter(2)}>
          <CardHead title="Empresas vencedoras" subtitle="Valor homologado para cada empresa nesta licitação." />
          <ul className="gs-winner-list">
            {bid.winners.map((winner) => (
              <li key={winner.cnpj}>
                <div>
                  <Link className="gs-company-link" href={`/gestor/fornecedores/${winner.cnpj}?${query}`}>{winner.name}</Link>
                  <small>{maskCnpj(winner.cnpj)}</small>
                </div>
                <OriginTag origin={winner.origin} city={companyCity(directory?.get(winner.cnpj))} />
                <strong>{money(winner.value)}</strong>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="ov-card ov-section ov-enter" style={enter(3)}>
        <CardHead
          title="Itens comprados"
          subtitle={items.length ? `${count(items.length)} itens, com quantidade, preço unitário e empresa vencedora.` : "Itens desta licitação."}
        />
        {items.length === 0 ? (
          <DataState error={itemsResult.error} fallback={itemsResult.unavailable ?? "A fonte de dados não traz itens para esta licitação."} />
        ) : (
          <>
            <div className="gs-table-scroll">
              <table className="gs-table gs-items-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Descrição</th>
                    <th scope="col" className="is-number">Quantidade</th>
                    <th scope="col" className="is-number">Preço unitário</th>
                    <th scope="col" className="is-number">Valor total</th>
                    <th scope="col">Vencedor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, MAX_ITEMS).map((item) => {
                    const origin = originOf(item.cnpj ? directory?.get(item.cnpj) : undefined, municipality.name);
                    return (
                      <tr key={`${item.numero_sequencial_item_licitacao}-${item.cnpj}`}>
                        <td className="gs-rank">{item.numero_sequencial_item_licitacao}</td>
                        <td className="gs-item-description">{item.descricao_item_licitacao ?? "Sem descrição"}</td>
                        <td className="is-number">{quantity(item.quantidade)} <small>{item.unidade?.toLowerCase()}</small></td>
                        <td className="is-number">{unitMoney(item.valor_unitario)}</td>
                        <td className="is-number"><strong>{money(item.valor_vencedor)}</strong></td>
                        <td>
                          <span className={`gs-winner is-${origin}`}>
                            <i aria-hidden="true" />{titleCase(item.razao_social ?? "Não informado")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {items.length > MAX_ITEMS && <p className="gs-note">Mostrando os primeiros {count(MAX_ITEMS)} de {count(items.length)} itens.</p>}
          </>
        )}
      </article>
    </main>
  );
}
