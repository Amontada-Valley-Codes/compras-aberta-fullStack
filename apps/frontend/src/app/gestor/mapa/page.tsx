import type { Metadata } from "next";
import { count, money, percent } from "@/features/public-data/format";
import { GestorFlowMap, type MapCity, type OutsideState } from "@/features/dashboard/gestor/GestorFlowMap";
import {
  CardHead, DataState, GestorMissingMunicipality, PageHeading, PartialNotice, SourceNote, enter,
} from "@/features/dashboard/gestor/GestorStates";
import { loadCompanyDirectory, loadParticipations } from "@/features/dashboard/gestor/gestor-api";
import { getMunicipalityOptions, resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { normalizeCity, participationsOfYear } from "@/features/dashboard/gestor/gestor-domain";
import { loadCearaMap } from "@/features/dashboard/gestor/geo-api";

export const metadata: Metadata = {
  title: "Mapa | Painel do Gestor | Compras Abertas",
};

const FLOW_CITIES = 12;

export default async function GestorMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;
  const { municipality, year } = context;

  const [map, participations, directory, municipalities] = await Promise.all([
    loadCearaMap().catch(() => null),
    loadParticipations(municipality.tceCode).catch(() => null),
    loadCompanyDirectory().catch(() => null),
    getMunicipalityOptions(),
  ]);

  if (!map || !participations || !directory) {
    return (
      <main className="gs-main">
        <PageHeading eyebrow={`MAPA • ${year}`} title={`Para onde vai o dinheiro de ${municipality.name}`} />
        <DataState error="Não foi possível carregar o mapa ou os fornecedores agora. Tente novamente em instantes." fallback="" />
      </main>
    );
  }

  // Cidade de cada empresa (cadastro da Receita) → código IBGE do município.
  const ibgeByName = new Map((municipalities.data ?? []).map((item) => [normalizeCity(item.name), item.ibgeCode]));
  const nameByIbge = new Map((municipalities.data ?? []).map((item) => [item.ibgeCode, item.name]));
  const perCity = new Map<string, { value: number; suppliers: Set<string> }>();
  const perState = new Map<string, { value: number; suppliers: Set<string> }>();
  let unknown = 0;
  let total = 0;

  for (const row of participationsOfYear(participations, year)) {
    const value = Number(row.valor_total_vencido) || 0;
    total += value;
    const company = directory.get(row.cnpj);
    const ibge = company?.uf_empresa === "CE" ? ibgeByName.get(normalizeCity(company.municipio_empresa)) : undefined;
    if (ibge) {
      const entry = perCity.get(ibge) ?? { value: 0, suppliers: new Set<string>() };
      entry.value += value;
      entry.suppliers.add(row.cnpj);
      perCity.set(ibge, entry);
    } else if (company?.uf_empresa && company.uf_empresa !== "CE") {
      const entry = perState.get(company.uf_empresa) ?? { value: 0, suppliers: new Set<string>() };
      entry.value += value;
      entry.suppliers.add(row.cnpj);
      perState.set(company.uf_empresa, entry);
    } else {
      unknown += value;
    }
  }

  const cities: MapCity[] = map.shapes.map((shape) => ({
    ...shape,
    name: nameByIbge.get(shape.ibge) ?? `Município ${shape.ibge}`,
    value: perCity.get(shape.ibge)?.value ?? 0,
    suppliers: perCity.get(shape.ibge)?.suppliers.size ?? 0,
  }));
  const flows = [...perCity.entries()]
    .filter(([ibge]) => ibge !== municipality.ibgeCode)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, FLOW_CITIES)
    .map(([ibge]) => ibge);
  const outside: OutsideState[] = [...perState.entries()]
    .map(([uf, entry]) => ({ uf, value: entry.value, suppliers: entry.suppliers.size }))
    .sort((a, b) => b.value - a.value);

  const inCeara = [...perCity.values()].reduce((sum, entry) => sum + entry.value, 0);
  const local = perCity.get(municipality.ibgeCode)?.value ?? 0;
  const outsideTotal = outside.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <main className="gs-main">
      <PageHeading
        eyebrow={`MAPA • ${year}`}
        title={`Para onde vai o dinheiro de ${municipality.name}`}
        summary="Cada município do Ceará pintado pelo valor que a prefeitura pagou a fornecedores sediados nele. As linhas mostram as cidades que mais receberam."
      />

      {total === 0 ? (
        <DataState error={null} fallback={`Nenhuma compra homologada em ${year}.`} />
      ) : (
        <>
          <section className="gs-stats ov-section ov-enter" style={enter(1)} aria-label="Resumo geográfico">
            <div className="is-good"><small>Ficou em {municipality.name}</small><b>{percent((local / total) * 100)}</b><em>{money(local)}</em></div>
            <div><small>Outras cidades do Ceará</small><b>{percent(((inCeara - local) / total) * 100)}</b><em>{count(Math.max(0, perCity.size - (perCity.has(municipality.ibgeCode) ? 1 : 0)))} municípios</em></div>
            <div><small>Fora do Ceará</small><b>{percent((outsideTotal / total) * 100)}</b><em>{count(outside.length)} {outside.length === 1 ? "estado" : "estados"}</em></div>
            <div><small>Total homologado</small><b>{money(total)}</b></div>
          </section>
          {unknown > 0 && <PartialNotice>{money(unknown)} foram para empresas sem cidade identificada no cadastro e não aparecem no mapa.</PartialNotice>}

          <article className="ov-card ov-section ov-enter" style={enter(2)}>
            <CardHead title="Mapa dos fornecedores" subtitle="Passe o mouse em um município ou em uma cidade da lista para ver o valor." />
            <GestorFlowMap
              width={map.width}
              height={map.height}
              cities={cities}
              originIbge={municipality.ibgeCode}
              flows={flows}
              outside={outside}
              total={total}
              municipalityName={municipality.name}
            />
          </article>
        </>
      )}

      <SourceNote>
        Fontes: valores homologados do TCE-CE, cidade de cada empresa no cadastro da Receita Federal (pela API Compra Aberta) e malha
        municipal do IBGE.
      </SourceNote>
    </main>
  );
}
