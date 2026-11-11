import Image from "next/image";
import { Search } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { landingData } from "../../landing-mock";

export function DataExplorerSection() {
  const data = landingData;
  return (
    <section className="opportunities-section" id="oportunidades">
      <div className="public-container opportunity-showcase">
        <div className="opportunity-intro">
          <h2>
            Processos <em>manuais</em> custam tempo, esforço e recursos.
          </h2>
          <p>
            Chega de perder tempo entre planilhas e portais. O Compras Abertas
            reúne dados públicos em um só lugar para você acompanhar gastos,
            identificar oportunidades e tomar decisões com mais confiança.
          </p>
          <div className="opportunity-badges" aria-label="Fontes de dados integradas">
            <span className="data-source-badge"><Image src="/images/data-sources/pncp.png" alt="PNCP" width={82} height={27} /></span>
            <span className="data-source-badge"><Image src="/images/data-sources/tce-ce.png" alt="TCE Ceará" width={92} height={31} /></span>
            <span className="data-source-badge data-source-badge--named"><Image src="/images/data-sources/opencnpj.png" alt="" width={30} height={30} />OpenCNPJ</span>
            <span className="data-source-badge"><Image src="/images/data-sources/ibge.svg" alt="IBGE" width={80} height={28} /></span>
          </div>
        </div>
        <div className="opportunity-hero-image" aria-hidden="true">
          <Image src="/images/hero/foto-hero.png" alt="" fill sizes="(max-width: 767px) 1px, (max-width: 900px) 875px, min(85vw, 1460px)" />
        </div>
        <form className="opportunity-search" action="/analise" method="get">
          <PublicFilterSelect name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="landing" options={data.municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []} />
          <PublicFilterSelect name="ano" label="Ano" icon="year" variant="landing" defaultValue="2026" options={[
            { value: "2026", label: "2026" },
            { value: "2025", label: "2025" },
            { value: "2024", label: "2024" },
          ]} />
          <button className="opportunity-search-button" type="submit" aria-label="Consultar dados"><Search size={24} /><span>Consultar dados</span></button>
        </form>
        {data.municipalities.error && <p className="public-data-state" role="status">Lista de municípios: {data.municipalities.error}</p>}
      </div>
    </section>
  );
}
