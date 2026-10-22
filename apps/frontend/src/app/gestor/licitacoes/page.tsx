import type { Metadata } from "next";
import { count, money, percent } from "@/features/public-data/format";
import { GestorBidsTable } from "@/features/dashboard/gestor/GestorBidsTable";
import { DataState, GestorMissingMunicipality, PageHeading, enter, gestorQuery } from "@/features/dashboard/gestor/GestorStates";
import { loadBids, loadCompanyDirectory, loadParticipations } from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { buildBids, participationsOfYear } from "@/features/dashboard/gestor/gestor-domain";

export const metadata: Metadata = {
  title: "Licitações | Painel do Gestor | Compras Abertas",
};

export default async function GestorBidsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year, municipalityIbge, isAdmin } = context;

  const [bids, participations, directory] = await Promise.all([
    loadBids(municipality.tceCode, year).catch(() => null),
    loadParticipations(municipality.tceCode).catch(() => null),
    loadCompanyDirectory().catch(() => null),
  ]);

  const rows = bids ? buildBids(bids, participationsOfYear(participations ?? [], year), directory, municipality.name) : [];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const withWinner = rows.filter((row) => row.winners.length > 0).length;
  const withLocal = rows.filter((row) => row.hasLocalWinner).length;

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`LICITAÇÕES • ${year}`}
        title={`Licitações de ${municipality.name}`}
        summary="Todas as licitações realizadas no ano, com as empresas vencedoras. Abra uma licitação para ver os itens comprados."
      />

      {!bids ? (
        <DataState error="Não foi possível carregar as licitações agora. Tente novamente em instantes." fallback="" />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo das licitações do ano">
            <div><small>Licitações</small><b>{count(rows.length)}</b></div>
            <div><small>Valor total</small><b>{money(total)}</b></div>
            <div><small>Valor médio</small><b>{money(rows.length ? total / rows.length : 0)}</b></div>
            <div>
              <small>Com vencedor da cidade</small>
              <b>{count(withLocal)}</b>
              <em>{withWinner ? `${percent((withLocal / withWinner) * 100)} das que têm vencedor` : "—"}</em>
            </div>
          </section>

          <article className="ov-card ov-section ov-enter" style={enter(2)}>
            {!participations && <p className="gs-note gs-note--top">Não foi possível carregar as empresas vencedoras agora; a lista mostra só os dados das licitações.</p>}
            <GestorBidsTable rows={rows} query={gestorQuery(year, municipalityIbge, isAdmin)} />
          </article>
        </>
      )}
    </main>
  );
}
