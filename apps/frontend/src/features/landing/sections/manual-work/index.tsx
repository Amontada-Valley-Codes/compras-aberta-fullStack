import Image from "next/image";

function PainIcon({ type }: { type: "files" | "time" | "check" }) {
  if (type === "files") {
    return (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M8 6.5h8.2L20 10.3v11.2H8V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M16 6.5v4h4M11 14h6M11 17.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 9.5v12h3" stroke="#e3aa2f" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "time") {
    return (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 9.5v5l3.3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 6.5 3.5 8M23 6.5l1.5 1.5" stroke="#e3aa2f" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m10 14.2 2.7 2.8 5.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 5.5v3M19.5 7h3" stroke="#e3aa2f" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const painPoints = [
  { icon: <PainIcon type="files" />, text: "Planilhas, PDFs e portais espalhados." },
  { icon: <PainIcon type="time" />, text: "Horas gastas conferindo cada informação." },
  { icon: <PainIcon type="check" />, text: "Pouco tempo para decidir com segurança." },
]; 

export function ManualWorkSection() {
  return (
    <section className="manual-work-section">
      <div className="public-container manual-work-grid">
        <div className="manual-work-copy">
          <h2>Você não precisa fazer tudo na mão.</h2>
          <p>
            Encontrar uma oportunidade não deveria significar abrir dezenas de
            abas, conferir planilhas e juntar informações uma por uma.
          </p>
          <ul>
            {painPoints.map((point) => (
              <li key={point.text}>
                <span aria-hidden="true">{point.icon}</span>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
          <p className="manual-work-bridge">
            A Compras Abertas organiza esse caminho para você enxergar o que
            importa e agir no momento certo.
          </p>
        </div>
        <div className="manual-work-visual">
          <Image
            src="/sections/trabalho-manual.png"
            alt="Profissional analisando documentos e planilhas no trabalho"
            fill
            sizes="(max-width: 900px) 100vw, 52vw"
          />
        </div>
      </div>
    </section>
  );
}
