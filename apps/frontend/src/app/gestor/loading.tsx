function Block({ className = "" }: { className?: string }) {
  return <span className={`gs-skeleton ${className}`} aria-hidden="true" />;
}

// Aparece no lugar do conteúdo enquanto a página busca os dados (o cabeçalho
// e o menu do layout continuam na tela).
export default function GestorLoading() {
  return (
    <main className="gs-main" aria-busy="true" aria-live="polite">
      <p className="gs-loading-note">
        <span className="gs-loading-dot" aria-hidden="true" />
        Carregando os dados públicos… Na primeira consulta do dia, contratos e PCA podem levar alguns minutos (o PNCP limita a velocidade das consultas).
      </p>
      <Block className="gs-skeleton-title" />
      <Block className="gs-skeleton-subtitle" />
      <section className="gs-metrics">
        {[1, 2, 3, 4].map((item) => <Block key={item} className="gs-skeleton-card" />)}
      </section>
      <section className="ov-grid gs-skeleton-grid">
        <Block className="gs-skeleton-chart ov-span-6" />
        <Block className="gs-skeleton-chart ov-span-6" />
      </section>
      <Block className="gs-skeleton-table" />
    </main>
  );
}
