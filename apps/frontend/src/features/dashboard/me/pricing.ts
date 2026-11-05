import type {
  PricingParams,
  TrackedBidItem,
  TrackedBidMetadata,
} from "./workspace-types";

/* ------------------------------------------------------------------ */
/* Calculadora de preço a partir do custo                              */
/* ------------------------------------------------------------------ */

/**
 * Preço de venda que cobre custo + impostos + despesas + margem.
 * Impostos, despesas e margem são percentuais SOBRE O PREÇO DE VENDA
 * (é assim que o Simples Nacional incide), por isso a divisão:
 *   preço = custo / (1 − (impostos + despesas + margem) / 100)
 */
export function priceFromCost(
  cost: number,
  taxPct: number,
  expensesPct: number,
  marginPct: number,
): number | null {
  const denom = 1 - (taxPct + expensesPct + marginPct) / 100;
  if (!(cost > 0) || denom <= 0.05) return null;
  // Arredonda para cima no centavo para nunca ficar abaixo do necessário
  return Math.ceil((cost / denom) * 100 - 1e-6) / 100;
}

/** Margem líquida (%) de um preço, descontados impostos e despesas. */
export function netMarginPct(
  price: number | null | undefined,
  cost: number | null | undefined,
  params: Pick<PricingParams, "taxPct" | "expensesPct">,
): number | null {
  if (!price || price <= 0 || !cost || cost <= 0) return null;
  const net = price * (1 - (params.taxPct + params.expensesPct) / 100) - cost;
  return (net / price) * 100;
}

/* ------------------------------------------------------------------ */
/* Conferência antes de gerar a proposta                               */
/* ------------------------------------------------------------------ */

export type ProposalMode = "inicial" | "ajustada";

export interface ProposalIssue {
  level: "error" | "warning" | "info";
  message: string;
}

export interface ProposalAnalysis {
  items: Array<TrackedBidItem & { unitPrice: number }>;
  total: number;
  issues: ProposalIssue[];
  canGenerate: boolean;
}

export function priceForMode(
  item: TrackedBidItem,
  mode: ProposalMode,
): number | null {
  const value = mode === "inicial" ? item.initialUnitPrice : item.finalUnitPrice;
  return value && value > 0 ? value : null;
}

function listNumbers(items: TrackedBidItem[]): string {
  const nums = items.map((i) => i.itemNumber);
  if (nums.length <= 8) return nums.join(", ");
  return `${nums.slice(0, 8).join(", ")} e mais ${nums.length - 8}`;
}

export function analyzeProposal(params: {
  items: TrackedBidItem[];
  mode: ProposalMode;
  metadata: TrackedBidMetadata;
  isServiceBid: boolean;
  company: { cnpj: string; cityState: string };
}): ProposalAnalysis {
  const { items, mode, metadata, isServiceBid, company } = params;
  const issues: ProposalIssue[] = [];
  const selected = items.filter((i) => i.selected);

  if (selected.length === 0) {
    issues.push({
      level: "error",
      message: "Nenhum item selecionado na tabela de precificação.",
    });
    return { items: [], total: 0, issues, canGenerate: false };
  }

  const withoutPrice = selected.filter((i) => priceForMode(i, mode) === null);
  const included = selected
    .filter((i) => priceForMode(i, mode) !== null)
    .map((i) => ({ ...i, unitPrice: priceForMode(i, mode) as number }));

  if (mode === "inicial" && withoutPrice.length > 0) {
    issues.push({
      level: "error",
      message: `Sem valor inicial: item ${listNumbers(withoutPrice)}. Preencha o preço ou desmarque o item.`,
    });
  }

  if (mode === "ajustada") {
    if (included.length === 0) {
      issues.push({
        level: "error",
        message:
          "Nenhum item com valor final. Informe o valor arrematado na coluna Valor Final ou na aba Sessão Pública.",
      });
    } else if (withoutPrice.length > 0) {
      issues.push({
        level: "info",
        message: `Item ${listNumbers(withoutPrice)} sem valor final — fica fora da proposta ajustada (considerado não arrematado).`,
      });
    }
  }

  if (!isServiceBid) {
    const noBrand = included.filter((i) => !i.brand.trim());
    if (noBrand.length > 0) {
      issues.push({
        level: "warning",
        message: `Marca não informada: item ${listNumbers(noBrand)}. Em compra de produtos o edital normalmente exige marca e modelo.`,
      });
    }
  }

  const aboveEstimate = included.filter(
    (i) =>
      !i.confidentialBudget &&
      i.estimatedUnitValue !== null &&
      i.estimatedUnitValue > 0 &&
      i.unitPrice > i.estimatedUnitValue + 0.004,
  );
  if (aboveEstimate.length > 0) {
    issues.push({
      level: "warning",
      message: `Preço acima do valor estimado pelo órgão: item ${listNumbers(aboveEstimate)}. Pode haver desclassificação.`,
    });
  }

  const belowFloor = included.filter(
    (i) => i.minUnitPrice && i.minUnitPrice > 0 && i.unitPrice < i.minUnitPrice - 0.004,
  );
  if (belowFloor.length > 0) {
    issues.push({
      level: "warning",
      message: `Preço abaixo do seu piso: item ${listNumbers(belowFloor)}.`,
    });
  }

  const belowCost = included.filter(
    (i) => i.unitCost && i.unitCost > 0 && i.unitPrice < i.unitCost - 0.004,
  );
  if (belowCost.length > 0) {
    issues.push({
      level: "warning",
      message: `Preço abaixo do custo informado: item ${listNumbers(belowCost)}.`,
    });
  }

  if (!company.cnpj) {
    issues.push({
      level: "warning",
      message: "CNPJ da empresa não encontrado no cadastro.",
    });
  }
  if (!company.cityState) {
    issues.push({
      level: "warning",
      message:
        "Município da empresa não cadastrado — o local da assinatura sairá em branco para preencher à mão.",
    });
  }

  const missingTerms = [
    !metadata.proposalValidity && "validade da proposta",
    !metadata.deliveryTerm && "prazo de entrega",
    !metadata.paymentTerm && "condição de pagamento",
  ].filter(Boolean) as string[];
  if (missingTerms.length > 0) {
    issues.push({
      level: "info",
      message: `Não preenchido na Visão Geral: ${missingTerms.join(", ")}. Sairá "Conforme edital" (validade: 60 dias).`,
    });
  }

  const total = included.reduce(
    (sum, i) => sum + (i.quantity ?? 1) * i.unitPrice,
    0,
  );

  return {
    items: included,
    total,
    issues,
    canGenerate: !issues.some((i) => i.level === "error"),
  };
}

/* ------------------------------------------------------------------ */
/* Valor por extenso (R$)                                              */
/* ------------------------------------------------------------------ */

const UNITS = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];
const TENS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
  "oitenta", "noventa",
];
const HUNDREDS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) parts.push(HUNDREDS[h]);
  if (r > 0 && r < 20) {
    parts.push(UNITS[r]);
  } else if (r >= 20) {
    const t = Math.floor(r / 10);
    const u = r % 10;
    parts.push(u > 0 ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const groups: Array<{ value: number; singular: string; plural: string }> = [
    { value: Math.floor(n / 1e9) % 1000, singular: "bilhão", plural: "bilhões" },
    { value: Math.floor(n / 1e6) % 1000, singular: "milhão", plural: "milhões" },
    { value: Math.floor(n / 1e3) % 1000, singular: "mil", plural: "mil" },
    { value: n % 1000, singular: "", plural: "" },
  ];

  const words: string[] = [];
  let lastValue = 0;
  groups.forEach((g, idx) => {
    if (g.value === 0) return;
    let chunk: string;
    if (idx === 2 && g.value === 1) {
      chunk = "mil";
    } else {
      const base = below1000(g.value);
      const suffix = g.value === 1 ? g.singular : g.plural;
      chunk = suffix ? `${base} ${suffix}` : base;
    }
    words.push(chunk);
    lastValue = g.value;
  });

  // Conector "e" antes do último grupo quando ele é < 100 ou centena exata
  // (ex.: "mil e quinhentos", "dois milhões e quinhentos mil")
  if (words.length > 1 && (lastValue < 100 || lastValue % 100 === 0)) {
    const tail = words.pop() as string;
    return `${words.join(" ")} e ${tail}`;
  }
  return words.join(" ");
}

export function currencyToWordsBr(value: number): string {
  const totalCents = Math.round(Math.max(0, value) * 100);
  const reais = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  const parts: string[] = [];
  if (reais > 0) {
    const exactMillions = reais >= 1e6 && reais % 1e6 === 0;
    parts.push(
      `${integerToWords(reais)}${exactMillions ? " de" : ""} ${reais === 1 ? "real" : "reais"}`,
    );
  }
  if (cents > 0) {
    parts.push(`${integerToWords(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  }
  if (parts.length === 0) return "zero real";
  return parts.join(" e ");
}
