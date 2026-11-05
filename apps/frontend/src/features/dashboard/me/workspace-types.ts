import {
  evaluateBidMatch,
  type CompanyMatchProfile,
  type EnrichedMeBid,
  type MeBidItem,
  type MePncpBid,
} from "./cnae-match";

export type BidStage =
  | "analise"
  | "proposta"
  | "lance"
  | "sessao"
  | "homologada"
  | "desistida";

export interface BidStageDefinition {
  id: BidStage;
  label: string;
  shortLabel: string;
  tone: "blue" | "orange" | "indigo" | "teal" | "emerald" | "danger";
  description: string;
}

export const BID_STAGES: BidStageDefinition[] = [
  {
    id: "analise",
    label: "Análise",
    shortLabel: "Em análise",
    tone: "blue",
    description: "Editais salvos para leitura e avaliação de viabilidade.",
  },
  {
    id: "proposta",
    label: "Recebendo Proposta",
    shortLabel: "Recebendo proposta",
    tone: "blue",
    description: "Licitações com itens selecionados em fase de precificação e cadastro.",
  },
  {
    id: "lance",
    label: "Fase de Lance",
    shortLabel: "Fase de lance",
    tone: "indigo",
    description: "Certames em disputa de preços no portal eletrônico.",
  },
  {
    id: "sessao",
    label: "Sessão Pública",
    shortLabel: "Sessão pública",
    tone: "teal",
    description: "Análise de documentos de habilitação, amostras ou recursos.",
  },
  {
    id: "homologada",
    label: "Homologada",
    shortLabel: "Homologada",
    tone: "emerald",
    description: "Licitações concluídas e adjudicadas/homologadas.",
  },
  {
    id: "desistida",
    label: "Desistidas",
    shortLabel: "Desistida",
    tone: "danger",
    description: "Editais descartados após análise comercial ou técnica.",
  },
];

export const STAGE_MAP: Record<BidStage, BidStageDefinition> = BID_STAGES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<BidStage, BidStageDefinition>,
);

export const PRESET_BID_STATUSES: string[] = [
  "Aguardando leitura",
  "Cotando fornecedores",
  "Precificação concluída",
  "Documentação pronta",
  "Proposta cadastrada no portal",
  "1º colocado / Arrematante",
  "Em fase de recurso",
  "Contrato / Ata assinada",
];

export interface TrackedBidItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number | null;
  unit: string | null;
  estimatedUnitValue: number | null;
  confidentialBudget: boolean;
  benefitName: string | null;
  selected: boolean;
  brand: string;
  model: string;
  minUnitPrice: number | null;
  initialUnitPrice: number | null;
  /** Valor unitário final obtido na disputa/negociação (base da proposta ajustada). */
  finalUnitPrice?: number | null;
  /** Custo unitário de aquisição/produção (base da calculadora de preços). */
  unitCost?: number | null;
  notes: string;
  isManual?: boolean;
}

export interface QualificationCheckItem {
  id: string;
  title: string;
  category: string;
  checked: boolean;
  dueDate: string | null;
  notes: string;
}

export interface PricingParams {
  /** Impostos sobre a venda (ex.: alíquota efetiva do Simples Nacional). */
  taxPct: number;
  /** Frete, embalagem, taxas e demais despesas, em % do preço de venda. */
  expensesPct: number;
  /** Margem de lucro mínima aceitável — define o piso de lance. */
  minMarginPct: number;
  /** Margem de lucro desejada — define o valor inicial da proposta. */
  targetMarginPct: number;
}

export const DEFAULT_PRICING_PARAMS: PricingParams = {
  taxPct: 6,
  expensesPct: 4,
  minMarginPct: 8,
  targetMarginPct: 25,
};

export interface TrackedBidMetadata {
  deliveryTerm?: string;
  paymentTerm?: string;
  proposalValidity?: string;
  auctioneerName?: string;
  auctioneerPhone?: string;
  auctioneerEmail?: string;
  deliveryAddress?: string;
  publicSessionAt?: string | null;
  appealDeadlineAt?: string | null;
  counterAppealDeadlineAt?: string | null;
  placement?: string;
  finalNegotiatedValue?: number | null;
  winnerName?: string;
  sessionNotes?: string;
  pricingParams?: PricingParams;
  qualificationChecklist?: QualificationCheckItem[];
}

export interface TrackedBid {
  id: string;
  bidControlId: string;
  stage: BidStage;
  nickname: string | null;
  customStatus: string | null;
  tags: string[];
  notes: string;
  bidSnapshot: MePncpBid;
  metadata: TrackedBidMetadata;
  items: TrackedBidItem[];
  createdAt: string;
  updatedAt: string;
}

export type AgendaEventType = "abertura" | "sessao" | "prazo" | "lembrete";

export interface AgendaReminder {
  id: string;
  trackedBidId: string | null;
  title: string;
  description: string | null;
  dueAt: string;
  type: AgendaEventType;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEventItem {
  id: string;
  dateKey: string; // YYYY-MM-DD local
  dueAt: string;
  timeLabel: string;
  title: string;
  subtitle: string;
  type: AgendaEventType;
  bidControlId: string | null;
  reminderId: string | null;
  completed?: boolean;
}

export function createDefaultQualificationChecklist(): QualificationCheckItem[] {
  return [
    {
      id: "cnd-federal",
      title: "Certidão Conjunta Receita Federal e Dívida Ativa da União (INSS)",
      category: "Regularidade Fiscal",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "cnd-estadual",
      title: "Certidão Negativa de Débitos Estaduais (SEFAZ)",
      category: "Regularidade Fiscal",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "cnd-municipal",
      title: "Certidão Negativa de Tributos Municipais (Prefeitura da Sede)",
      category: "Regularidade Fiscal",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "crf-fgts",
      title: "Certificado de Regularidade do FGTS (CRF / Caixa)",
      category: "Regularidade Social",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "cndt-trabalhista",
      title: "Certidão Negativa de Débitos Trabalhistas (CNDT / TST)",
      category: "Regularidade Trabalhista",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "falencia",
      title: "Certidão Negativa de Falência e Recuperação Judicial",
      category: "Qualificação Econômica",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "atestado-tecnico",
      title: "Atestado(s) de Capacidade Técnica compatível com o objeto",
      category: "Qualificação Técnica",
      checked: false,
      dueDate: null,
      notes: "",
    },
    {
      id: "declaracao-mpe",
      title: "Declaração de Enquadramento ME/EPP (Lei Complementar 123/2006)",
      category: "Declarações",
      checked: false,
      dueDate: null,
      notes: "",
    },
  ];
}

export function snapshotFromBid(bid: MePncpBid): MePncpBid {
  return {
    id: bid.id,
    purchaseNumber: bid.purchaseNumber,
    process: bid.process ?? null,
    year: bid.year,
    sequential: bid.sequential,
    object: bid.object,
    complementaryInfo: bid.complementaryInfo ?? null,
    modalityId: bid.modalityId,
    modality: bid.modality,
    disputeMode: bid.disputeMode ?? null,
    instrumentType: bid.instrumentType ?? null,
    legalBasis: bid.legalBasis ?? null,
    legalBasisDescription: bid.legalBasisDescription ?? null,
    srp: Boolean(bid.srp),
    confidentialBudget: bid.confidentialBudget,
    situation: bid.situation ?? "Divulgada no PNCP",
    agencyCnpj: bid.agencyCnpj,
    agencyName: bid.agencyName,
    unitName: bid.unitName,
    uasgCode: bid.uasgCode ?? null,
    sphereId: bid.sphereId ?? null,
    sphereName: bid.sphereName ?? null,
    powerName: bid.powerName ?? null,
    inferredKind: bid.inferredKind,
    city: bid.city,
    uf: bid.uf,
    ibgeCode: bid.ibgeCode ?? null,
    estimatedValue: bid.estimatedValue ?? null,
    awardedValue: bid.awardedValue ?? null,
    publishedAt: bid.publishedAt ?? null,
    updatedAt: bid.updatedAt ?? null,
    openingAt: bid.openingAt ?? null,
    closingAt: bid.closingAt ?? null,
    isOpen: Boolean(bid.isOpen),
    daysLeft: bid.daysLeft ?? null,
    disputeUrl: bid.disputeUrl ?? null,
    electronicProcessUrl: bid.electronicProcessUrl ?? null,
    pncpGovUrl: bid.pncpGovUrl,
    systemName: bid.systemName ?? null,
    portalName: bid.portalName ?? null,
    portalUrl: bid.portalUrl ?? null,
    portalUrlIsDirect: Boolean(bid.portalUrlIsDirect),
    integratorName: bid.integratorName ?? null,
  };
}

export function enrichSnapshotBid(
  snapshot: MePncpBid,
  companyProfile: CompanyMatchProfile,
  liveBid?: EnrichedMeBid | null,
): EnrichedMeBid {
  if (liveBid) return liveBid;

  // Recalcula dinamicamente dias restantes a partir do closingAt/openingAt
  const targetIso = snapshot.closingAt || snapshot.openingAt;
  let isOpen = snapshot.isOpen;
  let daysLeft = snapshot.daysLeft;

  if (targetIso) {
    const targetMs = new Date(targetIso).getTime();
    if (!Number.isNaN(targetMs)) {
      const diffMs = targetMs - Date.now();
      isOpen = diffMs > -3600_000;
      daysLeft = Math.ceil(diffMs / 86_400_000);
    }
  }

  const hydrated: MePncpBid = {
    ...snapshot,
    isOpen,
    daysLeft,
  };

  return {
    ...hydrated,
    match: evaluateBidMatch(hydrated, companyProfile),
  };
}

export function mapPncpItemToTracked(
  item: MeBidItem,
  selected: boolean,
  existing?: TrackedBidItem,
): TrackedBidItem {
  const defaultPrice =
    !item.confidentialBudget && item.unitValue && item.unitValue > 0
      ? item.unitValue
      : null;

  return {
    id: existing?.id ?? `item-${item.number}`,
    itemNumber: item.number,
    description: item.description,
    quantity: item.quantity ?? 1,
    unit: item.unit ?? "UN",
    estimatedUnitValue: item.unitValue ?? null,
    confidentialBudget: Boolean(item.confidentialBudget),
    benefitName: item.benefitName ?? null,
    selected,
    brand: existing?.brand ?? "",
    model: existing?.model ?? "",
    minUnitPrice: existing?.minUnitPrice ?? null,
    initialUnitPrice: existing?.initialUnitPrice ?? defaultPrice,
    finalUnitPrice: existing?.finalUnitPrice ?? null,
    unitCost: existing?.unitCost ?? null,
    notes: existing?.notes ?? "",
    isManual: false,
  };
}

export function parseAnyDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Try direct parsing first (handles ISO: 2026-11-05T12:00:00Z)
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  // Brazilian format: DD/MM/YYYY [às|at|T] HH:mm[:ss] or DD-MM-YYYY
  const brMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(?:às\s+|at\s+|T)?(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i,
  );
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
    const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
    const brDate = new Date(year, month, day, hour, min, sec);
    if (!Number.isNaN(brDate.getTime())) return brDate;
  }

  return null;
}

export function toLocalDateKey(isoOrDate: unknown): string | null {
  const d = parseAnyDate(isoOrDate);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function subtractBusinessDays(target: Date, businessDays: number): Date {
  const result = new Date(target.getTime());
  let remaining = businessDays;
  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

export interface BidMilestone {
  id: string;
  label: string;
  dateLabel: string;
  relativeLabel: string;
  tone: "today" | "upcoming" | "urgent" | "past" | "unset";
  editableKey?: "appealDeadlineAt" | "counterAppealDeadlineAt";
  rawDate: string | null;
}

function formatShortDatePt(d: Date, includeTime = false): string {
  const datePart = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!includeTime) return datePart;
  const timePart = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} às ${timePart}`;
}

function describeRelativeDays(target: Date): {
  text: string;
  tone: "today" | "upcoming" | "urgent" | "past";
} {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diffDays = Math.round(
    (startTarget.getTime() - startToday.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return { text: "hoje", tone: "today" };
  if (diffDays === 1) return { text: "amanhã", tone: "urgent" };
  if (diffDays > 1 && diffDays <= 3) {
    return { text: `restam ${diffDays} dias`, tone: "urgent" };
  }
  if (diffDays > 3) {
    return { text: `restam ${diffDays} dias`, tone: "upcoming" };
  }
  return { text: "prazo encerrado", tone: "past" };
}

export function computeBidMilestones(tracked: TrackedBid): BidMilestone[] {
  const snap = tracked.bidSnapshot;
  const savedDate = new Date(tracked.createdAt || Date.now());
  const openingIso = snap.closingAt || snap.openingAt;
  const openingDate = openingIso ? new Date(openingIso) : null;
  const hasValidOpening =
    openingDate !== null && !Number.isNaN(openingDate.getTime());

  const milestones: BidMilestone[] = [];

  // 1. Análise do edital
  const analiseRel = describeRelativeDays(savedDate);
  milestones.push({
    id: "analise",
    label: "Análise do edital",
    dateLabel: `salvo em ${formatShortDatePt(savedDate)}`,
    relativeLabel: analiseRel.tone === "past" ? "iniciada" : analiseRel.text,
    tone: analiseRel.tone === "past" ? "upcoming" : analiseRel.tone,
    rawDate: savedDate.toISOString(),
  });

  if (hasValidOpening && openingDate) {
    // 2. Esclarecimentos / Impugnações (Art. 164 Lei 14.133: até 3 dias úteis antes)
    const impugnDate = subtractBusinessDays(openingDate, 3);
    const impugnRel = describeRelativeDays(impugnDate);
    milestones.push({
      id: "impugnacao",
      label: "Esclarecimentos / Impugnações",
      dateLabel: `até ${formatShortDatePt(impugnDate)}`,
      relativeLabel: impugnRel.text,
      tone: impugnRel.tone,
      rawDate: impugnDate.toISOString(),
    });

    // 3. Precificação (1 dia útil antes da abertura)
    const precifDate = subtractBusinessDays(openingDate, 1);
    const precifRel = describeRelativeDays(precifDate);
    milestones.push({
      id: "precificacao",
      label: "Precificação final",
      dateLabel: `até ${formatShortDatePt(precifDate)}`,
      relativeLabel: precifRel.text,
      tone: precifRel.tone,
      rawDate: precifDate.toISOString(),
    });

    // 4. Fim de cadastramento da proposta
    const cadRel = describeRelativeDays(openingDate);
    milestones.push({
      id: "cadastro",
      label: "Fim de cadastramento",
      dateLabel: `até ${formatShortDatePt(openingDate, true)}`,
      relativeLabel: cadRel.text,
      tone: cadRel.tone,
      rawDate: openingDate.toISOString(),
    });

    // 5. Data de abertura
    milestones.push({
      id: "abertura",
      label: "Abertura / Disputa",
      dateLabel: formatShortDatePt(openingDate, true),
      relativeLabel: "Data oficial",
      tone: cadRel.tone === "past" ? "past" : "today",
      rawDate: openingDate.toISOString(),
    });
  }

  // 6. Recurso
  const appealRaw = tracked.metadata.appealDeadlineAt ?? null;
  const appealDate = appealRaw ? new Date(appealRaw) : null;
  if (appealDate && !Number.isNaN(appealDate.getTime())) {
    const rel = describeRelativeDays(appealDate);
    milestones.push({
      id: "recurso",
      label: "Prazo de Recurso",
      dateLabel: formatShortDatePt(appealDate),
      relativeLabel: rel.text,
      tone: rel.tone,
      editableKey: "appealDeadlineAt",
      rawDate: appealRaw,
    });
  } else {
    milestones.push({
      id: "recurso",
      label: "Recurso",
      dateLabel: "Definir data",
      relativeLabel: "Pós-sessão",
      tone: "unset",
      editableKey: "appealDeadlineAt",
      rawDate: null,
    });
  }

  // 7. Contrarrazão
  const counterRaw = tracked.metadata.counterAppealDeadlineAt ?? null;
  const counterDate = counterRaw ? new Date(counterRaw) : null;
  if (counterDate && !Number.isNaN(counterDate.getTime())) {
    const rel = describeRelativeDays(counterDate);
    milestones.push({
      id: "contrarrazao",
      label: "Contrarrazão",
      dateLabel: formatShortDatePt(counterDate),
      relativeLabel: rel.text,
      tone: rel.tone,
      editableKey: "counterAppealDeadlineAt",
      rawDate: counterRaw,
    });
  } else {
    milestones.push({
      id: "contrarrazao",
      label: "Contrarrazão",
      dateLabel: "Definir data",
      relativeLabel: "Pós-recurso",
      tone: "unset",
      editableKey: "counterAppealDeadlineAt",
      rawDate: null,
    });
  }

  return milestones;
}

export function buildCalendarEvents(
  trackedBids: TrackedBid[],
  reminders: AgendaReminder[],
): CalendarEventItem[] {
  const events: CalendarEventItem[] = [];

  for (const tb of trackedBids) {
    if (tb.stage === "desistida") continue;

    const snap = tb.bidSnapshot;
    const modShort = (snap.modality || "Licitação")
      .replace(/eletr[oô]nic[oa]/gi, "")
      .trim()
      .toUpperCase();
    const numLabel = snap.purchaseNumber || `${snap.sequential}/${snap.year}`;
    const shortHeader = tb.nickname || `${modShort} ${numLabel}`;
    const orgSubtitle = snap.unitName || snap.agencyName || `${snap.city}/${snap.uf}`;

    // Abertura / encerramento de propostas
    const rawSnap = (snap || {}) as unknown as Record<string, unknown>;
    const openingCandidate =
      snap.closingAt ||
      snap.openingAt ||
      rawSnap.dataAberturaProposta ||
      rawSnap.dataEncerramentoProposta ||
      rawSnap.dataAbertura;

    if (openingCandidate) {
      const d = parseAnyDate(openingCandidate);
      if (d) {
        const dateKey = toLocalDateKey(d);
        if (dateKey) {
          const rawTime = d.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const timeLabel = rawTime === "00:00" ? "Abertura" : rawTime;
          events.push({
            id: `open-${tb.bidControlId}`,
            dateKey,
            dueAt: d.toISOString(),
            timeLabel,
            title: shortHeader,
            subtitle: orgSubtitle,
            type: "abertura",
            bidControlId: tb.bidControlId,
            reminderId: null,
          });

          // Prazo limite de impugnação (3 dias úteis antes) se ainda estiver em aberto
          const impugn = subtractBusinessDays(d, 3);
          const impugnKey = toLocalDateKey(impugn);
          if (impugnKey && impugnKey !== dateKey) {
            events.push({
              id: `impugn-${tb.bidControlId}`,
              dateKey: impugnKey,
              dueAt: impugn.toISOString(),
              timeLabel: "18:00",
              title: `Impugnação: ${shortHeader}`,
              subtitle: orgSubtitle,
              type: "prazo",
              bidControlId: tb.bidControlId,
              reminderId: null,
            });
          }
        }
      }
    }

    // Sessão pública agendada manualmente
    if (tb.metadata?.publicSessionAt) {
      const sDate = parseAnyDate(tb.metadata.publicSessionAt);
      if (sDate) {
        const sKey = toLocalDateKey(sDate);
        if (sKey) {
          events.push({
            id: `session-${tb.bidControlId}`,
            dateKey: sKey,
            dueAt: sDate.toISOString(),
            timeLabel: sDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            title: `Sessão: ${shortHeader}`,
            subtitle: orgSubtitle,
            type: "sessao",
            bidControlId: tb.bidControlId,
            reminderId: null,
          });
        }
      }
    }
  }

  // Lembretes personalizados
  const bidByInternalId = new Map(trackedBids.map((t) => [t.id, t]));
  for (const rem of reminders) {
    const d = new Date(rem.dueAt);
    const dateKey = toLocalDateKey(d);
    if (!dateKey) continue;
    const linked = rem.trackedBidId ? bidByInternalId.get(rem.trackedBidId) : null;
    events.push({
      id: `rem-${rem.id}`,
      dateKey,
      dueAt: d.toISOString(),
      timeLabel: d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      title: rem.title,
      subtitle:
        rem.description ||
        (linked
          ? linked.nickname ||
            `${linked.bidSnapshot.modality} ${linked.bidSnapshot.purchaseNumber}`
          : "Lembrete da empresa"),
      type: rem.type || "lembrete",
      bidControlId: linked?.bidControlId ?? null,
      reminderId: rem.id,
      completed: rem.completed,
    });
  }

  events.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return events;
}
