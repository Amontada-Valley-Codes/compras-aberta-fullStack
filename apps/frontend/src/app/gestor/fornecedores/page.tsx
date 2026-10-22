import type { Metadata } from "next";
import { count, money, percent } from "@/features/public-data/format";
import { GestorSuppliersRanking } from "@/features/dashboard/gestor/GestorSuppliersRanking";
import { DataState, GestorMissingMunicipality, PageHeading, enter, gestorQuery } from "@/features/dashboard/gestor/GestorStates";
import { loadCompanyDirectory, loadParticipations } from "@/features/dashboard/gestor/gestor-api";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { buildSuppliers, participationsOfYear, topShare } from "@/features/dashboard/gestor/gestor-domain";

export const metadata: Metadata = {
  title: "Fornecedores | Painel do Gestor | Compras Abertas",
};

export default async function GestorSuppliersPage({
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
  const local = suppliers.filter((supplier) => supplier.origin === "local");
  const localValue = local.reduce((sum, supplier) => sum + supplier.total, 0);

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`FORNECEDORES • ${year}`}
        title={`Fornecedores de ${municipality.name}`}
        summary="Quem venceu licitações da prefeitura no ano, de onde é cada empresa e quanto o dinheiro está concentrado em poucos fornecedores."
      />

      {!participations ? (
        <DataState error="Não foi possível carregar os fornecedores agora. Tente novamente em instantes." fallback="" />
      ) : suppliers.length === 0 ? (
        <DataState error={null} fallback={`Nenhuma empresa venceu licitações de ${municipality.name} em ${year}.`} />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Concentração dos fornecedores">
            <div><small>Fornecedores</small><b>{count(suppliers.length)}</b><em>{money(total)} homologados</em></div>
            <div>
              <small>Fornecedores da cidade</small>
              <b>{directory ? count(local.length) : "—"}</b>
              <em>{directory ? `${percent(total ? (localValue / total) * 100 : 0)} do valor` : "Cidade das empresas indisponível agora"}</em>
            </div>
            <div><small>Maior fornecedor</small><b>{percent(suppliers[0].share)}</b><em>do valor do ano</em></div>
            <div><small>5 maiores</small><b>{percent(topShare(suppliers, 5))}</b><em>do valor do ano</em></div>
            <div><small>10 maiores</small><b>{percent(topShare(suppliers, 10))}</b><em>do valor do ano</em></div>
          </section>

          <article className="ov-card ov-section ov-enter" style={enter(2)}>
            <GestorSuppliersRanking rows={suppliers} query={gestorQuery(year, municipalityIbge)} showCategory={false} />
          </article>
        </>
      )}
    </main>
  );
}
