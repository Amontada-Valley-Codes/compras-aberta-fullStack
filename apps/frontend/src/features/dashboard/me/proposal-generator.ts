import { formatCnpj } from "@/lib/format-br";
import { formatOrgName } from "./bid-formatters";
import { currencyToWordsBr, type ProposalMode } from "./pricing";
import type { TrackedBid, TrackedBidItem } from "./workspace-types";

export interface ProposalCompanyInfo {
  companyName: string;
  cnpj: string;
  porte: string;
  responsibleName: string;
  email: string;
  cityState: string;
}

export interface ProposalContent {
  mode: ProposalMode;
  /** Itens já conferidos, com o preço unitário do tipo de proposta escolhido. */
  items: Array<TrackedBidItem & { unitPrice: number }>;
  total: number;
  /** Em licitação de serviço a coluna Marca/Modelo é omitida. */
  isServiceBid: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function openPrintableProposalWindow(
  tracked: TrackedBid,
  company: ProposalCompanyInfo,
  content: ProposalContent,
): boolean {
  if (typeof window === "undefined") return false;

  const { mode, items: selectedItems, total: totalProposal, isServiceBid } =
    content;
  const snap = tracked.bidSnapshot;
  const meta = tracked.metadata;
  const isAdjusted = mode === "ajustada";
  const showBrand = !isServiceBid;
  const colCount = showBrand ? 7 : 6;

  const orgName = formatOrgName(snap.unitName || snap.agencyName);
  const processLabel = `${snap.modality} nº ${snap.purchaseNumber || `${snap.sequential}/${snap.year}`}`;
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const placeLabel = company.cityState || "______________________";
  const docTitle = isAdjusted ? "Proposta Ajustada" : "Proposta Comercial";
  const introText = isAdjusted
    ? "Apresentamos nossa proposta comercial ajustada ao valor final obtido na sessão pública, para fornecimento dos itens abaixo, em conformidade com o Edital e o Termo de Referência:"
    : "Apresentamos nossa proposta comercial para fornecimento dos itens abaixo especificados, em conformidade com as exigências do Edital e do Termo de Referência:";

  const rowsHtml =
    selectedItems.length > 0
      ? selectedItems
          .map((item) => {
            const qty = item.quantity ?? 1;
            const unitPrice = item.unitPrice;
            const subtotal = qty * unitPrice;
            const brandModel = [item.brand, item.model]
              .map((v) => v.trim())
              .filter(Boolean)
              .join(" / ");
            return `
              <tr>
                <td style="text-align:center;font-weight:600;">${item.itemNumber}</td>
                <td>
                  <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.description)}</div>
                  ${item.notes ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Obs: ${escapeHtml(item.notes)}</div>` : ""}
                </td>
                ${showBrand ? `<td>${escapeHtml(brandModel || "—")}</td>` : ""}
                <td style="text-align:center;">${escapeHtml(item.unit || "UN")}</td>
                <td style="text-align:right;">${qty.toLocaleString("pt-BR")}</td>
                <td style="text-align:right;">${money(unitPrice)}</td>
                <td style="text-align:right;font-weight:600;">${money(subtotal)}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="${colCount}" style="text-align:center;padding:20px;color:#64748b;">Nenhum item na proposta.</td></tr>`;

  const win = window.open("", "_blank");
  if (!win) return false;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Comercial — ${escapeHtml(processLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 32px;
      background: #f8fafc;
      line-height: 1.5;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 40px 44px;
    }
    .toolbar {
      max-width: 920px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .btn-print {
      background: #1d4ed8;
      color: #fff;
      border: 0;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 18px;
      border-bottom: 2px solid #0f2744;
      margin-bottom: 22px;
    }
    .company-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f2744;
      margin: 0 0 4px;
    }
    .company-meta {
      font-size: 12.5px;
      color: #475569;
    }
    .doc-tag {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .ref-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .ref-box strong { color: #0f172a; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin: 18px 0;
    }
    th {
      background: #0f2744;
      color: #ffffff;
      text-align: left;
      padding: 9px 10px;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .total-box {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
      margin-bottom: 24px;
    }
    .total-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 12px 20px;
      text-align: right;
    }
    .total-card small {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      color: #0369a1;
      font-weight: 700;
    }
    .total-card strong {
      font-size: 20px;
      color: #0f172a;
    }
    .conditions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 22px;
      font-size: 12.5px;
    }
    .cond-item {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .cond-item span {
      display: block;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }
    .declarations {
      font-size: 12px;
      color: #334155;
      margin-bottom: 36px;
    }
    .sig-box {
      margin-top: 48px;
      text-align: center;
      font-size: 13px;
    }
    .sig-line {
      width: 320px;
      border-top: 1px solid #334155;
      margin: 0 auto 6px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .sheet { border: 0; padding: 12px; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span style="font-size:13px;color:#475569;">Pré-visualização — ${docTitle}</span>
    <button class="btn-print" onclick="window.print()">Imprimir / Salvar em PDF</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="company-name">${escapeHtml(company.companyName || "Empresa Licitante")}</h1>
        <div class="company-meta">
          CNPJ: <strong>${escapeHtml(company.cnpj ? formatCnpj(company.cnpj) : "Não informado")}</strong>${company.porte ? ` • Porte: ${escapeHtml(company.porte)}` : ""}<br/>
          ${company.cityState ? `Sede: ${escapeHtml(company.cityState)}` : ""} ${company.email ? `${company.cityState ? "• " : ""}E-mail: ${escapeHtml(company.email)}` : ""}
        </div>
      </div>
      <span class="doc-tag">${docTitle}</span>
    </div>

    <div class="ref-box">
      <div><strong>Ao Órgão Comprador:</strong> ${escapeHtml(orgName)} (CNPJ ${escapeHtml(formatCnpj(snap.agencyCnpj))})</div>
      <div><strong>Referência:</strong> ${escapeHtml(processLabel)}${snap.process ? ` • Processo Administrativo: ${escapeHtml(snap.process)}` : ""}</div>
      <div style="margin-top:4px;"><strong>Objeto:</strong> ${escapeHtml(snap.object)}</div>
    </div>

    <p style="font-size:13px;margin:0 0 10px;">
      ${introText}
    </p>

    <table>
      <thead>
        <tr>
          <th style="width:52px;text-align:center;">Item</th>
          <th>Descrição / Especificação</th>
          ${showBrand ? `<th style="width:150px;">Marca / Modelo</th>` : ""}
          <th style="width:56px;text-align:center;">Unid.</th>
          <th style="width:68px;text-align:right;">Qtd.</th>
          <th style="width:110px;text-align:right;">Vlr. Unitário</th>
          <th style="width:115px;text-align:right;">Vlr. Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-card">
        <small>Valor Global da Proposta</small>
        <strong>${money(totalProposal)}</strong>
        <div style="font-size:11.5px;color:#334155;margin-top:4px;max-width:420px;">
          (${escapeHtml(currencyToWordsBr(totalProposal))})
        </div>
      </div>
    </div>

    <div class="conditions">
      <div class="cond-item">
        <span>Validade da Proposta</span>
        <strong>${escapeHtml(meta.proposalValidity || "60 (sessenta) dias")}</strong>
      </div>
      <div class="cond-item">
        <span>Prazo de Entrega / Execução</span>
        <strong>${escapeHtml(meta.deliveryTerm || "Conforme Edital")}</strong>
      </div>
      <div class="cond-item">
        <span>Condições de Pagamento</span>
        <strong>${escapeHtml(meta.paymentTerm || "Conforme Edital")}</strong>
      </div>
    </div>

    <div class="declarations">
      Declaramos que nos preços propostos estão inclusos todos os custos diretos e indiretos, tributos, encargos trabalhistas, previdenciários, fiscais, comerciais, seguros e despesas de frete/entrega até o local indicado pelo órgão contratante, nos termos da Lei nº 14.133/2021.
    </div>

    <div style="font-size:13px;text-align:right;color:#334155;">
      ${escapeHtml(placeLabel)}, ${escapeHtml(todayLabel)}.
    </div>

    <div class="sig-box">
      <div class="sig-line"></div>
      <strong>${escapeHtml(company.companyName || "Representante Legal")}</strong><br/>
      <span style="font-size:12px;color:#475569;">
        ${escapeHtml(company.responsibleName ? `Responsável: ${company.responsibleName} • ` : "")}CNPJ ${escapeHtml(company.cnpj ? formatCnpj(company.cnpj) : "")}
      </span>
    </div>
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
