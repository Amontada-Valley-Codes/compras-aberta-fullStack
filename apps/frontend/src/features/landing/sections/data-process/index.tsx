import Image from "next/image";
import Link from "next/link";

export function DataProcessSection() {
  return (
    <section className="data-process-section" id="processo-dados">
      <div className="public-container data-process-inner">
        <div className="section-heading centered data-process-heading">
          <h2>Conheça o processo por trás dos dados.</h2>
          <p>
            Reunimos, validamos e organizamos dados públicos para tornar a
            participação das microempresas mais fácil de entender.
          </p>
        </div>
        <picture className="data-process-picture">
          <source
            media="(max-width: 680px)"
            srcSet="/sections/fluxo-dados-mobile.png"
          />
          <Image
            src="/sections/fluxo-dados.png"
            alt="Fluxo de coleta, validação, cruzamento e organização dos dados de compras públicas"
            width={2001}
            height={786}
            sizes="(max-width: 680px) 94vw, 96vw"
          />
        </picture>
        <Link className="button data-process-action" href="/analise">
          Explorar os dados
        </Link>
      </div>
    </section>
  );
}
