function Block({ className = "" }: { className?: string }) {
  return <span className={`analysis-skeleton-block ${className}`} aria-hidden="true" />;
}

export default function AnalysisLoading() {
  return <div className="analysis-page analysis-skeleton-page" aria-busy="true" aria-live="polite">
    <header className="analysis-header">
      <div className="analysis-container analysis-skeleton-header"><Block className="analysis-skeleton-logo" /><Block className="analysis-skeleton-nav" /></div>
    </header>
    <main className="analysis-container analysis-main">
      <Block className="analysis-skeleton-back" />
      <section className="analysis-skeleton-title-row"><div><Block className="analysis-skeleton-title" /><Block className="analysis-skeleton-subtitle" /></div><Block className="analysis-skeleton-export" /></section>
      <section className="analysis-skeleton-filters"><Block /><Block /><Block className="analysis-skeleton-search" /></section>
      <section className="analysis-skeleton-kpis">{[1, 2, 3].map((item) => <article key={item}><div><Block className="analysis-skeleton-icon" /><Block className="analysis-skeleton-label" /></div><Block className="analysis-skeleton-value" /><Block className="analysis-skeleton-detail" /></article>)}</section>
      <section className="analysis-skeleton-chart-grid">{[1, 2, 3, 4].map((item) => <article key={item} className={`analysis-skeleton-chart-card ${item === 4 ? "analysis-skeleton-chart-card--share" : ""}`}><Block className="analysis-skeleton-chart-title" /><Block className="analysis-skeleton-chart-description" />{item === 4 ? <div className="analysis-skeleton-share"><div><Block className="analysis-skeleton-share-label" /><div className="analysis-skeleton-controls"><Block /><Block /></div><Block className="analysis-skeleton-donut" /><Block className="analysis-skeleton-share-value" /></div><div><Block className="analysis-skeleton-share-label" /><div className="analysis-skeleton-controls"><Block /><Block /></div><Block className="analysis-skeleton-donut analysis-skeleton-donut--second" /><Block className="analysis-skeleton-share-value" /></div></div> : <><div className="analysis-skeleton-controls"><Block /><Block /></div><div className="analysis-skeleton-chart"><div className="analysis-skeleton-y-labels">{[1, 2, 3, 4, 5].map((bar) => <Block key={bar} />)}</div><div className="analysis-skeleton-bars">{[1, 2, 3, 4, 5].map((bar) => <Block key={bar} className={`analysis-skeleton-bar analysis-skeleton-bar--${bar}`} />)}</div></div></>}</article>)}</section>
      <section className="analysis-skeleton-table"><Block className="analysis-skeleton-table-title" /><Block className="analysis-skeleton-table-description" /><div className="analysis-skeleton-table-head">{[1, 2, 3, 4, 5, 6, 7].map((item) => <Block key={item} />)}</div>{[1, 2, 3, 4, 5, 6].map((row) => <div className="analysis-skeleton-table-row" key={row}>{[1, 2, 3, 4, 5, 6, 7].map((cell) => <Block key={cell} />)}</div>)}</section>
    </main>
  </div>;
}
