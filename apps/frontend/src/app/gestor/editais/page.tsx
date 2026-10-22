import type { Metadata } from "next";
import { CalendarClock, ExternalLink } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { GestorTendersTable } from "@/features/dashboard/gestor/GestorTendersTable";
import {
  CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SectionTitle, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { formatDateTimeBr } from "@/features/dashboard/gestor/gestor-domain";
import { loadOpenTenders, loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import { daysUntil, unitLabel } from "@/features/dashboard/gestor/pncp-domain";

export const metadata: Metadata = {
  title: "Editais | Painel do Gestor | Compras Abertas",
};

export default async function GestorTendersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  const [open, published] = await Promise.all([
    loadOpenTenders(municipality.ibgeCode).catch(() => null),
    loadProcurements(municipality.ibgeCode, year).catch(() => null),
  ]);

  const rows = published?.rows ?? [];
  const estimated = rows.reduce((sum, row) => sum + (row.estimated ?? 0), 0);
  const awarded = rows.filter((row) => (row.awarded ?? 0) > 0);

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`EDITAIS • ${year}`}
        title={`Editais de ${municipality.name}`}
        summary="Editais com propostas abertas agora e todas as contratações que a prefeitura publicou no Portal Nacional de Contratações Públicas (PNCP)."
      />

      <SectionTitle index={1} title="Abertos agora" hint="Recebendo propostas, do que encerra primeiro para o último." />
      <section className="ov-section">
        {!open ? (
          <DataState error="Não foi possível consultar o PNCP agora. Tente novamente em instantes." fallback="" />
        ) : open.length === 0 ? (
          <DataState error={null} fallback="Nenhum edital com propostas abertas no momento." />
        ) : (
          <div className="gs-tenders">
            {open.map((tender, index) => {
              const daysLeft = daysUntil(tender.closingAt);
              return (
                <article key={tender.controlNumber} className="ov-card gs-tender ov-enter" style={enter(2 + index)}>
                  <div className="gs-tender-top">
                    <span className="gs-chip">{tender.modality}</span>
                    {daysLeft !== null && (
                      <em className={`gs-deadline ${daysLeft <= 7 ? "is-urgent" : ""}`}>
                        {daysLeft <= 0 ? "Encerra hoje" : daysLeft === 1 ? "Encerra amanhã" : `Faltam ${daysLeft} dias`}
                      </em>
                    )}
                  </div>
                  <h3>{tender.object}</h3>
                  <p className="gs-tender-unit">{unitLabel(tender.unitName)} • Nº {tender.purchaseNumber}</p>
                  <dl>
                    <div><dt>Valor estimado</dt><dd>{tender.estimated ? money(tender.estimated) : "Não informado"}</dd></div>
                    <div><dt><CalendarClock aria-hidden="true" /> Propostas até</dt><dd>{formatDateTimeBr(tender.closingAt)}</dd></div>
                  </dl>
                  <a className="ov-link" href={tender.link} target="_blank" rel="noopener noreferrer">Ver edital no PNCP <ExternalLink /></a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SectionTitle index={4} title={`Publicados em ${year}`} hint="Todas as contratações publicadas no ano, de todas as modalidades." />
      {!published ? (
        <DataState error="Não foi possível consultar o PNCP agora. Tente novamente em instantes." fallback="" />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(5)} aria-label="Resumo das contratações publicadas">
            <div><small>Contratações publicadas</small><b>{count(rows.length)}</b></div>
            <div><small>Valor estimado</small><b>{money(estimated)}</b></div>
            <div><small>Com resultado homologado</small><b>{awarded.length ? count(awarded.length) : "—"}</b><em>{awarded.length ? money(awarded.reduce((sum, row) => sum + (row.awarded ?? 0), 0)) : "a prefeitura não publica o homologado no PNCP"}</em></div>
            <div><small>Modalidades</small><b>{count(new Set(rows.map((row) => row.modality)).size)}</b></div>
          </section>
          {published.truncated && <PartialNotice>Parte das contratações não pôde ser carregada (volume muito grande ou falha no PNCP). Os números acima são parciais.</PartialNotice>}
          <article className="ov-card ov-section ov-enter" style={enter(6)}>
            <CardHead title="Contratações do ano" subtitle="Clique no ícone para abrir o edital completo no PNCP." />
            <GestorTendersTable rows={rows} />
          </article>
        </>
      )}

      <SourceNote>
        Fonte: Portal Nacional de Contratações Públicas (PNCP). Só aparece o que a prefeitura, as secretarias e os demais órgãos do
        município publicaram no portal.
      </SourceNote>
    </main>
  );
}
