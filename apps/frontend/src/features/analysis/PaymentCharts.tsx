"use client";
import type { PaymentNature } from "@/services/analytics/payments.types";
import { NatureBarChart, ShareDonutChart } from "@/features/public-data/PublicCharts";
import { money, percent } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";

type Metric = "total_controle" | "valor_me" | "percentual_me";
const paymentShareDesign = {
  size: 230,
  meColor: "#185A98",
  othersColor: "#B9CEDD",
  meMarkerClass: "local-share-tooltip-marker--general-me",
  othersMarkerClass: "local-share-tooltip-marker--general-others",
};

export function PaymentNatureChart({ data, metric }: { data: PaymentNature[]; metric: Metric }) {
  const rows = data.filter((row) => row[metric] != null).sort((a, b) => Number(b[metric]) - Number(a[metric]));
  if (!rows.length) return <p className="analysis-data-state">Sem base para calcular o percentual de pagamentos a ME.</p>;
  const isPercent = metric === "percentual_me";
  return <NatureBarChart id={`payments-${metric}`} color={isPercent ? "#0BA7B3" : "#185A98"}
    seriesName={isPercent ? "Percentual pago a ME" : metric === "valor_me" ? "Valor de compra para ME" : "Valor total pago"}
    labels={rows.map((row) => natureLabel(row.codigo_natureza, row.nome_natureza))} values={rows.map((row) => Number(row[metric]))}
    axisFormatter={isPercent ? (value) => `${Math.round(value)}%` : (value) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value)}
    tooltipFormatter={isPercent ? percent : money} />;
}
export function PaymentShareChart({ percentage }: { percentage: number }) {
  return <ShareDonutChart {...paymentShareDesign} percentage={percentage} chartId="payments-me-share"
    meLabel="Compras com ME" othersLabel="Demais pagamentos"
    centerLabel="compras com ME" ariaLabel={`${percent(percentage)} do valor pago foi destinado a microempresas`} />;
}

export function LocalPaymentShareChart({ percentage }: { percentage: number }) {
  return <ShareDonutChart {...paymentShareDesign} percentage={percentage} chartId="payments-local-me-share"
    meLabel="ME locais identificadas" othersLabel="Demais pagamentos, incluindo sede não identificada"
    centerLabel="compras com ME locais" ariaLabel={`${percent(percentage)} do total pago foi destinado a microempresas identificadas no município`} />;
}
