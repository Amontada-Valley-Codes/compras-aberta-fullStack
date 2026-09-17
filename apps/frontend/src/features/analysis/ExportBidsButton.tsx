"use client";

import { Download } from "lucide-react";
export interface ExportBid {
  numero_licitacao: string;
  empresa: string | null;
  cnpjMascarado: string;
  municipio: string;
  nome_natureza: string;
  ano_licitacao: number;
  valor_total_vencido: string;
}

const csvCell = (value: string | number | null) => {
  const raw = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

export function ExportBidsButton({ bids }: { bids: ExportBid[] }) {
  const exportCsv = () => {
    const header = ["Licitação", "Empresa", "CNPJ", "Município", "Natureza", "Ano", "Valor vencido"];
    const rows = bids.map((bid) => [bid.numero_licitacao, bid.empresa, bid.cnpjMascarado, bid.municipio, bid.nome_natureza, bid.ano_licitacao, bid.valor_total_vencido]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "licitacoes-exibidas.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return <button className="ds-button secondary" type="button" onClick={exportCsv} disabled={!bids.length}><Download /> Exportar registros exibidos</button>;
}
