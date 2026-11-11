"use client";
import { NatureBarChart, ShareDonutChart } from "@/features/public-data/PublicCharts";
import { money, percent } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";

type Metric = "total_controle" | "valor_me" | "valor_local" | "valor_demais" | "percentual_me" | "percentual_local_me";
export interface PaymentNatureChartRow {
  codigo_natureza: string;
  nome_natureza: string;
  total_controle: string;
  valor_me: string;
  valor_local?: number;
  valor_demais?: number;
  percentual_me?: number | null;
  percentual_local_me?: number | null;
}
const paymentShareDesign = {
  size: 230,
  meColor: "#185A98",
  othersColor: "#B9CEDD",
  meMarkerClass: "local-share-tooltip-marker--general-me",
  othersMarkerClass: "local-share-tooltip-marker--general-others",
};

export function PaymentNatureChart({ data, metric, height }: { data: PaymentNatureChartRow[]; metric: Metric; height?: number }) {
  const rows = data.filter((row) => row[metric] != null).sort((a, b) => Number(b[metric]) - Number(a[metric]));
  if (!rows.length) return <p className="analysis-data-state">Sem base para calcular o percentual de pagamentos a ME.</p>;
  const isPercent = metric === "percentual_me" || metric === "percentual_local_me";
  const isLocal = metric === "valor_local";
  const isLocalShare = metric === "percentual_local_me";
  const isRemaining = metric === "valor_demais";
  return <NatureBarChart id={`payments-${metric}`} color={isLocalShare ? "#D69E2E" : isPercent ? "#0BA7B3" : isLocal ? "#0B7F89" : isRemaining ? "#7A8D9B" : "#185A98"}
    seriesName={isLocalShare ? "Parcela local dos pagamentos a ME" : isPercent ? "Percentual pago a ME" : isLocal ? "Valor pago a ME locais" : isRemaining ? "Valor pago aos demais fornecedores" : metric === "valor_me" ? "Valor de compra para ME" : "Valor total pago"}
    labels={rows.map((row) => natureLabel(row.codigo_natureza, row.nome_natureza))} values={rows.map((row) => Number(row[metric]))}
    axisFormatter={isPercent ? (value) => `${Math.round(value)}%` : (value) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value)}
    tooltipFormatter={isPercent ? percent : money} height={height} />;
}
export function PaymentShareChart({ percentage, size = paymentShareDesign.size }: { percentage: number; size?: number }) {
  return <ShareDonutChart {...paymentShareDesign} size={size} percentage={percentage} chartId="payments-me-share"
    meLabel="Compras com ME" othersLabel="Demais pagamentos"
    centerLabel="compras com ME" ariaLabel={`${percent(percentage)} do valor pago foi destinado a microempresas`} />;
}

export function LocalPaymentShareChart({ percentage, size = paymentShareDesign.size }: { percentage: number; size?: number }) {
  return <ShareDonutChart {...paymentShareDesign} size={size} percentage={percentage} chartId="payments-local-me-share"
    meLabel="ME locais identificadas" othersLabel="Demais pagamentos, incluindo sede não identificada"
    centerLabel="compras com ME locais" ariaLabel={`${percent(percentage)} do total pago foi destinado a microempresas identificadas no município`} />;
}
