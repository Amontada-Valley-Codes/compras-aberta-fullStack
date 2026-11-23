import Script from "next/script";

/** O assistente Noupe é carregado somente pelos layouts autenticados pagos. */
export function NoupeWidget() {
  return <Script src="https://www.noupe.com/embed/01a0bbf1e3b870008bd12eb608ef47d63472.js" strategy="afterInteractive" />;
}
