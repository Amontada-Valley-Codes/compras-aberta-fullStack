import Image from "next/image";
import { Search } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { natureLabel } from "@/features/public-data/plain-language";
import { landingData } from "../../landing-mock";

export function DataExplorerSection() {
  const data = landingData;
  return (
    <section className="opportunities-section" id="oportunidades">
      <div className="public-container opportunity-showcase">
        <div className="opportunity-intro">
          <h2>Explore os dados de compras públicas do Ceará.</h2>
          <p>
            Consulte registros históricos e entenda como as microempresas
            participam das contratações em cada município.
          </p>
          <div
            className="opportunity-badges"
            aria-label="Fontes de dados integradas"
          >
            <span className="data-source-badge">
              <Image
                src="/images/data-sources/pncp.png"
                alt="PNCP"
                width={82}
                height={27}
              />
            </span>
            <span className="data-source-badge">
              <Image
                src="/images/data-sources/tce-ce.png"
                alt="TCE Ceará"
                width={92}
                height={31}
              />
            </span>
            <span className="data-source-badge data-source-badge--named">
              <Image
                src="/images/data-sources/opencnpj.png"
                alt=""
                width={30}
                height={30}
              />
              OpenCNPJ
            </span>
            <span className="data-source-badge">
              <Image
                src="/images/data-sources/ibge.svg"
                alt="IBGE"
                width={80}
                height={28}
              />
            </span>
          </div>
        </div>
        <div className="opportunity-person" aria-hidden="true">
          <Image
            src="/sections/imagem-sara.png?v=6"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 48vw"
          />
        </div>
        <form className="opportunity-search" action="/analise" method="get">
          <PublicFilterSelect
            name="municipio"
            label="Município"
            allLabel="Todos os municípios"
            icon="municipality"
            variant="landing"
            options={
              data.municipalities.data?.map((item) => ({
                value: item.ibgeCode,
                label: item.name,
              })) ?? []
            }
          />
          <PublicFilterSelect
            name="natureza"
            label="Tipo de compra"
            allLabel="Todos os tipos"
            icon="nature"
            variant="landing"
            options={
              data.expenses.data?.data.map((item) => ({
                value: item.codigo_natureza,
                label: natureLabel(item.codigo_natureza, item.nome_natureza),
              })) ?? []
            }
          />
          <button
            className="opportunity-search-button"
            type="submit"
            aria-label="Consultar dados"
          >
            <Search size={24} /> <span>Consultar dados</span>
          </button>
        </form>
        {data.municipalities.error && (
          <p className="public-data-state" role="status">
            Lista de municípios: {data.municipalities.error}
          </p>
        )}
      </div>
    </section>
  );
}
