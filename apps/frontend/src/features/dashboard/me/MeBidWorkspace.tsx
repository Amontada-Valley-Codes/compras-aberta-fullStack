"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Gavel,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { openDocumentInNewTab } from "@/utils/openInNewTab";
import type { CompanyMatchProfile, EnrichedMeBid, MePncpBid } from "./cnae-match";
import {
  formatCleanTitle,
  formatCurrencyBr,
  formatDateBr,
  formatOrgName,
} from "./bid-formatters";
import { GenerateProposalModal } from "./GenerateProposalModal";
import { netMarginPct, priceFromCost, type ProposalMode } from "./pricing";
import type { ProposalCompanyInfo } from "./proposal-generator";
import { useMeBidDetailQuery } from "./use-me-licitacoes";
import {
  BID_STAGES,
  computeBidMilestones,
  createDefaultQualificationChecklist,
  DEFAULT_PRICING_PARAMS,
  enrichSnapshotBid,
  mapPncpItemToTracked,
  PRESET_BID_STATUSES,
  STAGE_MAP,
  type AgendaEventType,
  type AgendaReminder,
  type BidStage,
  type PricingParams,
  type QualificationCheckItem,
  type TrackedBid,
  type TrackedBidItem,
  type TrackedBidMetadata,
} from "./workspace-types";

export type WorkspaceSubTab = "overview" | "items" | "qualification" | "session";

export interface MeBidWorkspaceProps {
  tracked: TrackedBid;
  liveBid?: EnrichedMeBid | null;
  companyMatchProfile: CompanyMatchProfile;
  reminders: AgendaReminder[];
  initialTab?: WorkspaceSubTab;
  onBack: () => void;
  onOpenSelectItems: () => void;
  onOpenChat: (bid: EnrichedMeBid) => void;
  onOpenFullOfficialFicha: (bid: EnrichedMeBid) => void;
  onUpdateTracked: (
    bidControlId: string,
    patch: {
      stage?: BidStage;
      nickname?: string | null;
      customStatus?: string | null;
      tags?: string[];
      notes?: string;
      bidSnapshot?: MePncpBid;
      metadata?: Partial<TrackedBidMetadata>;
      items?: TrackedBidItem[];
    },
  ) => Promise<TrackedBid>;
  onRemoveTracked: (bidControlId: string) => Promise<void>;
  onCreateReminder: (input: {
    title: string;
    description?: string;
    dueAt: string;
    type?: AgendaEventType;
    trackedBidId?: string | null;
  }) => Promise<AgendaReminder>;
  onUpdateReminder: (
    id: string,
    patch: Partial<
      Pick<AgendaReminder, "title" | "description" | "dueAt" | "completed">
    >,
  ) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = Number(normalized);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

export function MeBidWorkspace({
  tracked,
  liveBid,
  companyMatchProfile,
  reminders,
  initialTab = "overview",
  onBack,
  onOpenSelectItems,
  onOpenChat,
  onOpenFullOfficialFicha,
  onUpdateTracked,
  onRemoveTracked,
  onCreateReminder,
  onUpdateReminder,
  onDeleteReminder,
}: MeBidWorkspaceProps) {
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<WorkspaceSubTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, tracked.bidControlId]);

  const enrichedBid = useMemo(
    () =>
      enrichSnapshotBid(tracked.bidSnapshot, companyMatchProfile, liveBid),
    [companyMatchProfile, liveBid, tracked.bidSnapshot],
  );

  const { data: detailData, isLoading: loadingDetail } = useMeBidDetailQuery({
    agencyCnpj: enrichedBid.agencyCnpj,
    year: enrichedBid.year,
    sequential: enrichedBid.sequential,
    enabled: true,
  });

  const documents = detailData?.documents ?? [];
  const pncpItems = useMemo(() => detailData?.items ?? [], [detailData?.items]);

  // Apelido editável no topo
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(tracked.nickname ?? "");

  useEffect(() => {
    setNicknameDraft(tracked.nickname ?? "");
  }, [tracked.nickname]);

  // Tags
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  // Edição dos detalhes operacionais
  const [editingDetails, setEditingDetails] = useState(false);
  const [metaDraft, setMetaDraft] = useState<TrackedBidMetadata>(
    tracked.metadata,
  );

  useEffect(() => {
    setMetaDraft(tracked.metadata);
  }, [tracked.metadata]);

  // Observações
  const [notesDraft, setNotesDraft] = useState(tracked.notes);
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    setNotesDraft(tracked.notes);
    setNotesDirty(false);
  }, [tracked.notes, tracked.bidControlId]);

  // Formulário de novo lembrete
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [remTime, setRemTime] = useState("09:00");
  const [remDesc, setRemDesc] = useState("");

  // Edição de datas de Recurso / Contrarrazão direto no card de prazos
  const [editingMilestoneKey, setEditingMilestoneKey] = useState<
    "appealDeadlineAt" | "counterAppealDeadlineAt" | null
  >(null);
  const [milestoneDateDraft, setMilestoneDateDraft] = useState("");

  // Estado da tabela de precificação
  const [onlySelectedItems, setOnlySelectedItems] = useState(
    () => tracked.items.some((i) => i.selected),
  );
  const [itemSearch, setItemSearch] = useState("");
  const [showBulkCalc, setShowBulkCalc] = useState(false);
  const [bulkMode, setBulkMode] = useState<"cost" | "discount">("cost");
  const [bulkMinMarginPct, setBulkMinMarginPct] = useState("12");
  const [pricingDraft, setPricingDraft] = useState<PricingParams>(
    () => tracked.metadata.pricingParams ?? DEFAULT_PRICING_PARAMS,
  );
  const pricingParams = tracked.metadata.pricingParams ?? DEFAULT_PRICING_PARAMS;
  const [showFinalColumn, setShowFinalColumn] = useState(
    () =>
      ["lance", "sessao", "homologada"].includes(tracked.stage) ||
      tracked.items.some((i) => (i.finalUnitPrice ?? 0) > 0),
  );
  const [proposalModalMode, setProposalModalMode] =
    useState<ProposalMode | null>(null);
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUnit, setManualUnit] = useState("UN");

  // Nova exigência na aba Habilitação
  const [newQualTitle, setNewQualTitle] = useState("");
  const [newQualCategory, setNewQualCategory] = useState("Exigência do Edital");

  // Lista efetiva de itens: se tracked.items ainda estiver vazia e o PNCP trouxer itens,
  // monta uma visão inicial pronta para marcar/precificar
  const workingItems: TrackedBidItem[] = useMemo(() => {
    if (tracked.items.length > 0) return tracked.items;
    if (pncpItems.length > 0) {
      return pncpItems.map((it) => mapPncpItemToTracked(it, false));
    }
    return [];
  }, [pncpItems, tracked.items]);

  const selectedItemsCount = useMemo(
    () => workingItems.filter((i) => i.selected).length,
    [workingItems],
  );

  const filteredWorkingItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return workingItems.filter((it) => {
      if (onlySelectedItems && selectedItemsCount > 0 && !it.selected) {
        return false;
      }
      if (q) {
        const hay = `${it.itemNumber} ${it.description} ${it.brand} ${it.model}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [itemSearch, onlySelectedItems, selectedItemsCount, workingItems]);

  const proposalTotals = useMemo(() => {
    let minTotal = 0;
    let initialTotal = 0;
    let finalTotal = 0;
    let finalCount = 0;
    for (const it of workingItems) {
      if (!it.selected) continue;
      const qty = it.quantity ?? 1;
      if (it.minUnitPrice && it.minUnitPrice > 0) {
        minTotal += qty * it.minUnitPrice;
      }
      if (it.initialUnitPrice && it.initialUnitPrice > 0) {
        initialTotal += qty * it.initialUnitPrice;
      }
      if (it.finalUnitPrice && it.finalUnitPrice > 0) {
        finalTotal += qty * it.finalUnitPrice;
        finalCount += 1;
      }
    }
    return { minTotal, initialTotal, finalTotal, finalCount };
  }, [workingItems]);

  const isServiceBid = tracked.bidSnapshot.inferredKind === "service";

  const qualificationList: QualificationCheckItem[] = useMemo(
    () =>
      tracked.metadata.qualificationChecklist &&
      tracked.metadata.qualificationChecklist.length > 0
        ? tracked.metadata.qualificationChecklist
        : createDefaultQualificationChecklist(),
    [tracked.metadata.qualificationChecklist],
  );

  const checkedQualCount = useMemo(
    () => qualificationList.filter((q) => q.checked).length,
    [qualificationList],
  );

  const milestones = useMemo(() => computeBidMilestones(tracked), [tracked]);

  const bidReminders = useMemo(
    () => reminders.filter((r) => r.trackedBidId === tracked.id),
    [reminders, tracked.id],
  );

  const orgShort = formatOrgName(enrichedBid.unitName || enrichedBid.agencyName);
  const officialHeadline = `${(enrichedBid.modality || "LICITAÇÃO").toUpperCase()} ${enrichedBid.purchaseNumber || `${enrichedBid.sequential}/${enrichedBid.year}`} — ${orgShort.toUpperCase()}`;
  const currentStage = STAGE_MAP[tracked.stage] ?? STAGE_MAP.analise;

  const saveNickname = async () => {
    setEditingNickname(false);
    const trimmed = nicknameDraft.trim() || null;
    if (trimmed === (tracked.nickname ?? null)) return;
    await onUpdateTracked(tracked.bidControlId, { nickname: trimmed });
    toast.success("Apelido atualizado");
  };

  const handleAddTag = async () => {
    const clean = tagDraft.trim();
    if (!clean) {
      setAddingTag(false);
      return;
    }
    if (!tracked.tags.includes(clean)) {
      await onUpdateTracked(tracked.bidControlId, {
        tags: [...tracked.tags, clean],
      });
    }
    setTagDraft("");
    setAddingTag(false);
  };

  const handleRemoveTag = async (tag: string) => {
    await onUpdateTracked(tracked.bidControlId, {
      tags: tracked.tags.filter((t) => t !== tag),
    });
  };

  const handleSaveDetails = async () => {
    await onUpdateTracked(tracked.bidControlId, {
      metadata: metaDraft,
    });
    setEditingDetails(false);
    toast.success("Dados da participação atualizados!");
  };

  const handleSaveNotes = async () => {
    if (!notesDirty) return;
    await onUpdateTracked(tracked.bidControlId, { notes: notesDraft });
    setNotesDirty(false);
    toast.success("Observações salvas");
  };

  const handleCreateBidReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim() || !remDate) return;
    const dueIso = new Date(`${remDate}T${remTime || "09:00"}:00`).toISOString();
    await onCreateReminder({
      title: remTitle.trim(),
      description: remDesc.trim() || undefined,
      dueAt: dueIso,
      type: "lembrete",
      trackedBidId: tracked.id,
    });
    setRemTitle("");
    setRemDesc("");
    setShowReminderForm(false);
    toast.success("Lembrete adicionado à Agenda!");
  };

  const handleUpdateSingleItem = (
    itemId: string,
    patch: Partial<TrackedBidItem>,
  ) => {
    const nextItems = workingItems.map((it) =>
      it.id === itemId ? { ...it, ...patch } : it,
    );
    onUpdateTracked(tracked.bidControlId, {
      items: nextItems,
      ...(tracked.stage === "analise" && patch.selected
        ? { stage: "proposta" }
        : {}),
    });
  };

  const handleApplyBulkPricing = async () => {
    const pct = Math.max(0, Math.min(90, Number(bulkMinMarginPct) || 0));
    const factor = (100 - pct) / 100;

    const nextItems = workingItems.map((it) => {
      if (!it.selected) return it;
      const base =
        it.initialUnitPrice && it.initialUnitPrice > 0
          ? it.initialUnitPrice
          : !it.confidentialBudget &&
              it.estimatedUnitValue &&
              it.estimatedUnitValue > 0
            ? it.estimatedUnitValue
            : null;
      if (!base) return it;
      return {
        ...it,
        initialUnitPrice: base,
        minUnitPrice: Math.round(base * factor * 100) / 100,
      };
    });

    await onUpdateTracked(tracked.bidControlId, { items: nextItems });
    setShowBulkCalc(false);
    toast.success(`Piso mínimo calculado (-${pct}% sobre o valor inicial)`);
  };

  const handleApplyCostPricing = async () => {
    const p = pricingDraft;
    const values = [p.taxPct, p.expensesPct, p.minMarginPct, p.targetMarginPct];
    if (values.some((v) => !Number.isFinite(v) || v < 0)) {
      toast.error("Preencha todos os percentuais com números válidos.");
      return;
    }
    if (p.minMarginPct > p.targetMarginPct) {
      toast.error("A margem mínima não pode ser maior que a margem desejada.");
      return;
    }
    if (p.taxPct + p.expensesPct + p.targetMarginPct >= 95) {
      toast.error("Impostos + despesas + margem precisam somar menos de 95%.");
      return;
    }

    let priced = 0;
    let withoutCost = 0;
    let capped = 0;
    let notViable = 0;

    const nextItems = workingItems.map((it) => {
      if (!it.selected) return it;
      if (!it.unitCost || it.unitCost <= 0) {
        withoutCost += 1;
        return it;
      }
      const floor = priceFromCost(it.unitCost, p.taxPct, p.expensesPct, p.minMarginPct);
      let initial = priceFromCost(
        it.unitCost,
        p.taxPct,
        p.expensesPct,
        p.targetMarginPct,
      );
      if (floor === null || initial === null) return it;

      const estimate =
        !it.confidentialBudget && it.estimatedUnitValue && it.estimatedUnitValue > 0
          ? it.estimatedUnitValue
          : null;
      if (estimate !== null && initial > estimate) {
        initial = estimate;
        capped += 1;
      }
      if (estimate !== null && floor > estimate) notViable += 1;

      priced += 1;
      return { ...it, minUnitPrice: floor, initialUnitPrice: initial };
    });

    await onUpdateTracked(tracked.bidControlId, {
      items: nextItems,
      metadata: { pricingParams: p },
    });

    if (priced === 0) {
      toast.info(
        "Nenhum item calculado: informe o custo unitário na coluna Custo dos itens selecionados.",
      );
      return;
    }

    setShowBulkCalc(false);
    const extras = [
      capped > 0 && `${capped} limitado(s) ao valor estimado`,
      notViable > 0 && `${notViable} com piso acima do estimado (revise)`,
      withoutCost > 0 && `${withoutCost} sem custo informado`,
    ].filter(Boolean);
    toast.success(
      `${priced} ${priced === 1 ? "item calculado" : "itens calculados"}${extras.length ? ` — ${extras.join(", ")}` : ""}.`,
    );
  };

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) return;
    const nextNumber =
      workingItems.reduce((max, it) => Math.max(max, it.itemNumber), 0) + 1;
    const newItem: TrackedBidItem = {
      id: `manual-${Date.now()}`,
      itemNumber: nextNumber,
      description: manualDesc.trim(),
      quantity: Math.max(1, Number(manualQty) || 1),
      unit: manualUnit.trim().toUpperCase() || "UN",
      estimatedUnitValue: null,
      confidentialBudget: false,
      benefitName: null,
      selected: true,
      brand: "",
      model: "",
      minUnitPrice: null,
      initialUnitPrice: null,
      finalUnitPrice: null,
      unitCost: null,
      notes: "",
      isManual: true,
    };

    await onUpdateTracked(tracked.bidControlId, {
      items: [...workingItems, newItem],
      ...(tracked.stage === "analise" ? { stage: "proposta" } : {}),
    });
    setManualDesc("");
    setManualQty("1");
    setManualUnit("UN");
    setShowManualItemForm(false);
    toast.success("Item adicionado à proposta");
  };

  const handleDeleteManualItem = async (itemId: string) => {
    const nextItems = workingItems.filter((i) => i.id !== itemId);
    await onUpdateTracked(tracked.bidControlId, { items: nextItems });
  };

  const proposalCompany: ProposalCompanyInfo = useMemo(() => {
    const b = profile?.business;
    return {
      companyName: b?.nome_empresa || profile?.name || "",
      cnpj: b?.cnpj || profile?.cnpj || "",
      porte: b?.porte_empresa || "",
      responsibleName: profile?.name || "",
      email: profile?.email || "",
      cityState: b?.municipio ? `${b.municipio.nome}/${b.municipio.uf}` : "",
    };
  }, [profile]);

  const handleGenerateProposal = (mode?: ProposalMode) => {
    setProposalModalMode(
      mode ?? (proposalTotals.finalCount > 0 ? "ajustada" : "inicial"),
    );
  };

  const toggleQualificationItem = (id: string) => {
    const nextList = qualificationList.map((q) =>
      q.id === id ? { ...q, checked: !q.checked } : q,
    );
    onUpdateTracked(tracked.bidControlId, {
      metadata: { qualificationChecklist: nextList },
    });
  };

  const updateQualificationDate = (id: string, dueDate: string) => {
    const nextList = qualificationList.map((q) =>
      q.id === id ? { ...q, dueDate: dueDate || null } : q,
    );
    onUpdateTracked(tracked.bidControlId, {
      metadata: { qualificationChecklist: nextList },
    });
  };

  const handleAddQualificationReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQualTitle.trim()) return;
    const nextItem: QualificationCheckItem = {
      id: `custom-qual-${Date.now()}`,
      title: newQualTitle.trim(),
      category: newQualCategory,
      checked: false,
      dueDate: null,
      notes: "",
    };
    onUpdateTracked(tracked.bidControlId, {
      metadata: { qualificationChecklist: [...qualificationList, nextItem] },
    });
    setNewQualTitle("");
    toast.success("Exigência adicionada ao checklist");
  };

  const removeCustomQualItem = (id: string) => {
    const nextList = qualificationList.filter((q) => q.id !== id);
    onUpdateTracked(tracked.bidControlId, {
      metadata: { qualificationChecklist: nextList },
    });
  };

  const companyDocs = [
    {
      title: "Cartão CNPJ",
      url: profile?.business?.url_cartao_cnpj,
    },
    {
      title: "Contrato Social / Certificado MEI",
      url: profile?.business?.url_contrato_social,
    },
    {
      title: "Comprovante de Endereço",
      url: profile?.business?.url_comprovante_endereco,
    },
    {
      title: "Documento do Sócio / Responsável",
      url: profile?.business?.url_comprovante_socio,
    },
  ];

  return (
    <div className="ws-page">
      {/* Breadcrumb & Topo */}
      <div className="ws-breadcrumb">
        <button type="button" onClick={onBack} className="ws-breadcrumb__back">
          <ArrowLeft size={15} />
          <span>Minhas licitações</span>
        </button>
        <span className="ws-breadcrumb__sep">/</span>
        <span className="ws-breadcrumb__current">Gerenciar licitação</span>
      </div>

      {/* Cabeçalho principal */}
      <header className="ws-header">
        <div className="ws-header__main">
          {editingNickname ? (
            <div className="ws-nickname-editor">
              <input
                type="text"
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNickname();
                  if (e.key === "Escape") setEditingNickname(false);
                }}
                placeholder="Ex: Produtos Químicos — SESC (deixe vazio para usar o oficial)"
                autoFocus
              />
              <button
                type="button"
                className="ws-btn is-primary is-sm"
                onClick={saveNickname}
              >
                Salvar
              </button>
              <button
                type="button"
                className="ws-btn is-ghost is-sm"
                onClick={() => setEditingNickname(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="ws-header__title-row">
              <h1>{tracked.nickname || officialHeadline}</h1>
              <button
                type="button"
                className="ws-icon-btn"
                onClick={() => setEditingNickname(true)}
                title="Definir ou editar apelido da licitação"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}

          {tracked.nickname && (
            <span className="ws-header__official-sub">{officialHeadline}</span>
          )}

          <p className="ws-header__object">
            {formatCleanTitle(enrichedBid.object)}
          </p>

          <div className="ws-header__badges">
            <span className="ws-org-pill">
              <Building2 size={13} />
              {orgShort}
            </span>
            <span className="ws-meta-pill">
              <MapPin size={13} />
              {enrichedBid.city}/{enrichedBid.uf}
            </span>
            {enrichedBid.portalName && (
              <span className="ws-meta-pill">
                <Gavel size={13} />
                {enrichedBid.portalName.replace(/\s*\([^)]*\)\s*/g, "").trim()}
              </span>
            )}
          </div>
        </div>

        <div className="ws-header__actions">
          <button
            type="button"
            className="ws-btn is-ghost is-sm"
            onClick={() => onOpenFullOfficialFicha(enrichedBid)}
          >
            Ficha PNCP
          </button>
          <a
            href={enrichedBid.portalUrl || enrichedBid.pncpGovUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-btn is-primary is-sm"
          >
            <span>Ir ao Portal de Disputa</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Barra de Fase / Status / Tags */}
      <section className="ws-stage-bar">
        <div className="ws-stage-bar__group">
          <span className="ws-stage-bar__label">Fase</span>
          <Select
            value={tracked.stage}
            onValueChange={(val) => {
              if (val) {
                onUpdateTracked(tracked.bidControlId, {
                  stage: val as BidStage,
                });
              }
            }}
          >
            <SelectTrigger className={`ws-radix-stage-trigger tone-${currentStage.tone}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BID_STAGES.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="ws-stage-bar__divider" />

        <div className="ws-stage-bar__group">
          <span className="ws-stage-bar__label">Status</span>
          <Select
            value={tracked.customStatus ?? "__none__"}
            onValueChange={(val) => {
              onUpdateTracked(tracked.bidControlId, {
                customStatus: val === "__none__" ? null : val,
              });
            }}
          >
            <SelectTrigger className="ws-radix-status-trigger">
              <SelectValue placeholder="+ Definir status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">+ Definir status</SelectItem>
              {PRESET_BID_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="ws-stage-bar__divider" />

        <div className="ws-stage-bar__tags">
          <span className="ws-stage-bar__label">Tags</span>
          {tracked.tags.map((tag) => (
            <span key={tag} className="ws-tag-chip">
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remover tag ${tag}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {addingTag ? (
            <input
              type="text"
              className="ws-tag-inline-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={handleAddTag}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
                if (e.key === "Escape") setAddingTag(false);
              }}
              placeholder="Nova tag…"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="ws-tag-add-btn"
              onClick={() => setAddingTag(true)}
            >
              + tag
            </button>
          )}
        </div>

        <div className="ws-stage-bar__right">
          <button
            type="button"
            className="ws-remove-link"
            onClick={async () => {
              await onRemoveTracked(tracked.bidControlId);
              toast.info("Licitação removida de Minhas Licitações");
              onBack();
            }}
            title="Remover acompanhamento desta licitação"
          >
            <Trash2 size={14} />
            <span>Remover</span>
          </button>
        </div>
      </section>

      {/* Sub-abas */}
      <nav className="ws-tabs" aria-label="Seções do gerenciamento">
        <button
          type="button"
          className={`ws-tab ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Visão Geral
        </button>
        <button
          type="button"
          className={`ws-tab ${activeTab === "items" ? "is-active" : ""}`}
          onClick={() => setActiveTab("items")}
        >
          <span>Itens do edital</span>
          {selectedItemsCount > 0 && (
            <em className="ws-tab__badge">{selectedItemsCount}</em>
          )}
        </button>
        <button
          type="button"
          className={`ws-tab ${activeTab === "qualification" ? "is-active" : ""}`}
          onClick={() => setActiveTab("qualification")}
        >
          <span>Habilitação</span>
          <em className="ws-tab__badge is-muted">
            {checkedQualCount}/{qualificationList.length}
          </em>
        </button>
        <button
          type="button"
          className={`ws-tab ${activeTab === "session" ? "is-active" : ""}`}
          onClick={() => setActiveTab("session")}
        >
          Sessão Pública
        </button>
      </nav>

      {/* ==================== ABA 1: VISÃO GERAL ==================== */}
      {activeTab === "overview" && (
        <div className="ws-tab-stack">
          {/* Card Detalhes da Licitação */}
          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Detalhes da licitação</h2>
                <p>
                  Acompanhe e controle as principais informações sobre a sua
                  participação.
                </p>
              </div>
              {editingDetails ? (
                <div className="ws-inline-actions">
                  <button
                    type="button"
                    className="ws-btn is-ghost is-sm"
                    onClick={() => {
                      setMetaDraft(tracked.metadata);
                      setEditingDetails(false);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ws-btn is-primary is-sm"
                    onClick={handleSaveDetails}
                  >
                    <Check size={14} />
                    Salvar dados
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ws-edit-link"
                  onClick={() => setEditingDetails(true)}
                >
                  <Edit3 size={14} />
                  Editar dados complementares
                </button>
              )}
            </div>

            <div className="ws-details-grid">
              <div className="ws-detail-field">
                <span>Número do processo</span>
                <strong>
                  {enrichedBid.purchaseNumber ||
                    `${enrichedBid.sequential}/${enrichedBid.year}`}
                </strong>
              </div>

              <div className="ws-detail-field">
                <span>Salvo em</span>
                <strong>{formatDateBr(tracked.createdAt, false)}</strong>
              </div>

              <div className="ws-detail-field">
                <span>Abertura / Fim propostas</span>
                <strong>
                  {formatDateBr(
                    enrichedBid.closingAt || enrichedBid.openingAt,
                    true,
                  )}
                </strong>
              </div>

              <div className="ws-detail-field">
                <span>Sessão pública</span>
                {editingDetails ? (
                  <input
                    type="datetime-local"
                    value={
                      metaDraft.publicSessionAt
                        ? metaDraft.publicSessionAt.slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        publicSessionAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      }))
                    }
                  />
                ) : (
                  <strong>
                    {metaDraft.publicSessionAt
                      ? formatDateBr(metaDraft.publicSessionAt, true)
                      : "Não informada"}
                  </strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>Modalidade</span>
                <strong>{enrichedBid.modality}</strong>
              </div>

              <div className="ws-detail-field">
                <span>Registro de preço</span>
                <strong>{enrichedBid.srp ? "Sim (SRP)" : "Não"}</strong>
              </div>

              <div className="ws-detail-field">
                <span>Valor total estimado</span>
                <strong>
                  {enrichedBid.confidentialBudget
                    ? "Sigiloso"
                    : enrichedBid.estimatedValue &&
                        enrichedBid.estimatedValue > 0
                      ? formatCurrencyBr(enrichedBid.estimatedValue)
                      : "Sigiloso"}
                </strong>
              </div>

              <div className="ws-detail-field">
                <span>Órgão</span>
                <strong>{orgShort}</strong>
              </div>

              <div className="ws-detail-field">
                <span>Cidade</span>
                <strong>
                  {enrichedBid.city}/{enrichedBid.uf}
                </strong>
              </div>

              <div className="ws-detail-field">
                <span>Modo de disputa</span>
                <strong>{enrichedBid.disputeMode || "Conforme Edital"}</strong>
              </div>

              <div className="ws-detail-field">
                <span>Prazo de entrega</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.deliveryTerm ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        deliveryTerm: e.target.value,
                      }))
                    }
                    placeholder="Ex: 15 dias corridos"
                  />
                ) : (
                  <strong>{tracked.metadata.deliveryTerm || "—"}</strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>Prazo de pagamento</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.paymentTerm ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        paymentTerm: e.target.value,
                      }))
                    }
                    placeholder="Ex: 30 dias após NF"
                  />
                ) : (
                  <strong>{tracked.metadata.paymentTerm || "—"}</strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>Validade da proposta</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.proposalValidity ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        proposalValidity: e.target.value,
                      }))
                    }
                    placeholder="Ex: 60 dias"
                  />
                ) : (
                  <strong>{tracked.metadata.proposalValidity || "60 dias"}</strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>Nome do pregoeiro</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.auctioneerName ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        auctioneerName: e.target.value,
                      }))
                    }
                    placeholder="Nome do pregoeiro/agente"
                  />
                ) : (
                  <strong>{tracked.metadata.auctioneerName || "—"}</strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>Telefone do setor</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.auctioneerPhone ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        auctioneerPhone: e.target.value,
                      }))
                    }
                    placeholder="(00) 0000-0000"
                  />
                ) : (
                  <strong>{tracked.metadata.auctioneerPhone || "—"}</strong>
                )}
              </div>

              <div className="ws-detail-field">
                <span>E-mail de contato</span>
                {editingDetails ? (
                  <input
                    type="email"
                    value={metaDraft.auctioneerEmail ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        auctioneerEmail: e.target.value,
                      }))
                    }
                    placeholder="licitacao@orgao.gov.br"
                  />
                ) : (
                  <strong>{tracked.metadata.auctioneerEmail || "—"}</strong>
                )}
              </div>

              <div className="ws-detail-field is-span-full">
                <span>Endereço de entrega / execução</span>
                {editingDetails ? (
                  <input
                    type="text"
                    value={metaDraft.deliveryAddress ?? ""}
                    onChange={(e) =>
                      setMetaDraft((prev) => ({
                        ...prev,
                        deliveryAddress: e.target.value,
                      }))
                    }
                    placeholder="Local de entrega informado no Termo de Referência"
                  />
                ) : (
                  <strong>{tracked.metadata.deliveryAddress || "—"}</strong>
                )}
              </div>
            </div>

            {/* Observações internas */}
            <div className="ws-notes-block">
              <div className="ws-notes-block__top">
                <label htmlFor="ws-bid-notes">Observações</label>
                {notesDirty && (
                  <button
                    type="button"
                    className="ws-edit-link"
                    onClick={handleSaveNotes}
                  >
                    Salvar observações
                  </button>
                )}
              </div>
              <textarea
                id="ws-bid-notes"
                rows={3}
                value={notesDraft}
                onChange={(e) => {
                  setNotesDraft(e.target.value);
                  setNotesDirty(true);
                }}
                onBlur={handleSaveNotes}
                placeholder="Adicione observações sobre esta licitação para auxiliar na gestão da sua participação (ex: fornecedor cotado, custo de frete, exigência de amostra)…"
              />
            </div>

            {/* Botões de ação da ficha */}
            <div className="ws-overview-ctas">
              <button
                type="button"
                className="ws-btn is-accent-orange"
                onClick={() => setActiveTab("items")}
              >
                <Calculator size={16} />
                <span>Precificar itens</span>
              </button>

              <button
                type="button"
                className="ws-btn is-ghost"
                onClick={onOpenSelectItems}
              >
                <ListChecks size={16} />
                <span>
                  {selectedItemsCount > 0
                    ? `Alterar seleção (${selectedItemsCount})`
                    : "Selecionar itens"}
                </span>
              </button>

              <button
                type="button"
                className="ws-btn is-teal"
                onClick={() => onOpenChat(enrichedBid)}
              >
                <FileText size={16} />
                <span>Converse com o edital</span>
              </button>
            </div>
          </section>

          {/* Card Lembretes e Compromissos */}
          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Lembretes e compromissos</h2>
                <p>Prepare-se e não perca os prazos mais importantes.</p>
              </div>
              <button
                type="button"
                className="ws-edit-link"
                onClick={() => setShowReminderForm((prev) => !prev)}
              >
                <Plus size={15} />
                <span>Criar lembrete</span>
              </button>
            </div>

            {showReminderForm && (
              <form
                className="ws-inline-reminder-form"
                onSubmit={handleCreateBidReminder}
              >
                <input
                  type="text"
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="Título do lembrete (ex: Enviar pedido de esclarecimento)"
                  required
                />
                <input
                  type="date"
                  value={remDate}
                  onChange={(e) => setRemDate(e.target.value)}
                  required
                />
                <input
                  type="time"
                  value={remTime}
                  onChange={(e) => setRemTime(e.target.value)}
                />
                <input
                  type="text"
                  value={remDesc}
                  onChange={(e) => setRemDesc(e.target.value)}
                  placeholder="Observação opcional"
                />
                <div className="ws-inline-actions">
                  <button
                    type="button"
                    className="ws-btn is-ghost is-sm"
                    onClick={() => setShowReminderForm(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="ws-btn is-primary is-sm">
                    Salvar
                  </button>
                </div>
              </form>
            )}

            <div className="ws-milestones-grid">
              {milestones.map((ms) => {
                const isEditingThis =
                  ms.editableKey && editingMilestoneKey === ms.editableKey;

                return (
                  <div
                    key={ms.id}
                    className={`ws-milestone-card tone-${ms.tone} ${ms.editableKey ? "is-editable" : ""}`}
                    onClick={() => {
                      if (ms.editableKey && !isEditingThis) {
                        setEditingMilestoneKey(ms.editableKey);
                        setMilestoneDateDraft(
                          ms.rawDate ? ms.rawDate.slice(0, 10) : "",
                        );
                      }
                    }}
                  >
                    <strong className="ws-milestone-card__title">
                      {ms.label}
                    </strong>

                    {isEditingThis && ms.editableKey ? (
                      <div
                        className="ws-milestone-date-edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="date"
                          value={milestoneDateDraft}
                          onChange={(e) =>
                            setMilestoneDateDraft(e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const key = ms.editableKey!;
                            await onUpdateTracked(tracked.bidControlId, {
                              metadata: {
                                [key]: milestoneDateDraft
                                  ? new Date(
                                      `${milestoneDateDraft}T18:00:00`,
                                    ).toISOString()
                                  : null,
                              },
                            });
                            setEditingMilestoneKey(null);
                          }}
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="ws-milestone-card__date">
                          {ms.dateLabel}
                        </span>
                        <small className="ws-milestone-card__rel">
                          {ms.relativeLabel}
                        </small>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {bidReminders.length > 0 && (
              <div className="ws-custom-reminders">
                <span className="ws-sub-eyebrow">
                  Lembretes criados para este edital
                </span>
                <div className="ws-custom-reminders__list">
                  {bidReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className={`ws-reminder-row ${rem.completed ? "is-done" : ""}`}
                    >
                      <button
                        type="button"
                        className={`ws-checkbox ${rem.completed ? "is-checked" : ""}`}
                        onClick={() =>
                          onUpdateReminder(rem.id, {
                            completed: !rem.completed,
                          })
                        }
                      >
                        {rem.completed && <Check size={12} />}
                      </button>
                      <div className="ws-reminder-row__info">
                        <strong>{rem.title}</strong>
                        {rem.description && <span>{rem.description}</span>}
                      </div>
                      <time>{formatDateBr(rem.dueAt, true)}</time>
                      <button
                        type="button"
                        className="ws-icon-btn"
                        onClick={() => onDeleteReminder(rem.id)}
                        title="Excluir lembrete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Card Arquivos & Habilitação Rápida */}
          <div className="ws-bottom-split">
            <section className="ws-card">
              <div className="ws-card__header">
                <div>
                  <h2>Arquivos do portal</h2>
                  <p>Editais, Termos de Referência e anexos oficiais no PNCP.</p>
                </div>
              </div>

              {loadingDetail ? (
                <p className="ws-muted-msg">Carregando anexos oficiais…</p>
              ) : documents.length === 0 ? (
                <p className="ws-muted-msg">
                  Nenhum anexo avulso retornado. Consulte diretamente no Portal
                  de Disputa acima.
                </p>
              ) : (
                <div className="ws-files-list">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-file-row"
                    >
                      <FileText size={16} />
                      <div>
                        <strong>{doc.title}</strong>
                        <small>{doc.typeName}</small>
                      </div>
                      <Download size={15} />
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="ws-card">
              <div className="ws-card__header">
                <div>
                  <h2>Resumo da habilitação</h2>
                  <p>Progresso das certidões e documentos exigidos.</p>
                </div>
                <button
                  type="button"
                  className="ws-edit-link"
                  onClick={() => setActiveTab("qualification")}
                >
                  Abrir checklist
                </button>
              </div>

              <div className="ws-qual-summary-box">
                <div className="ws-qual-progress-head">
                  <strong>
                    {checkedQualCount} de {qualificationList.length} certidões
                    conferidas
                  </strong>
                  <span>
                    {Math.round(
                      (checkedQualCount /
                        Math.max(1, qualificationList.length)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="ws-progress-bar">
                  <div
                    style={{
                      width: `${Math.round((checkedQualCount / Math.max(1, qualificationList.length)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="ws-muted-msg">
                  Seus 4 documentos societários do cadastro já estão vinculados
                  na aba Habilitação.
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ==================== ABA 2: ITENS DO EDITAL (PRECIFICAÇÃO) ==================== */}
      {activeTab === "items" && (
        <section className="ws-card">
          <div className="ws-pricing-header">
            <div>
              <h2>Elaborar proposta</h2>
              <p>
                Precifique os itens que deseja vender, informe marca/modelo e
                defina seu valor mínimo de segurança.
              </p>
            </div>

            <div className="ws-pricing-header__actions">
              <label className="ws-search-input is-compact">
                <Search size={15} />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Pesquisar item…"
                />
              </label>

              <button
                type="button"
                className="ws-btn is-ghost is-sm"
                onClick={onOpenSelectItems}
              >
                <ListChecks size={15} />
                <span>Selecionar do edital</span>
              </button>

              <button
                type="button"
                className="ws-btn is-ghost is-sm"
                onClick={() => setShowManualItemForm((prev) => !prev)}
              >
                <Plus size={15} />
                <span>Item manual</span>
              </button>

              <button
                type="button"
                className="ws-btn is-primary is-sm"
                onClick={() => handleGenerateProposal()}
              >
                <Printer size={15} />
                <span>Gerar proposta</span>
              </button>
            </div>
          </div>

          {/* Barra de ferramentas secundária */}
          <div className="ws-pricing-toolbar">
            <button
              type="button"
              role="switch"
              aria-checked={onlySelectedItems && selectedItemsCount > 0}
              className={`ws-toggle-switch ${onlySelectedItems && selectedItemsCount > 0 ? "is-on" : ""}`}
              onClick={() => setOnlySelectedItems((prev) => !prev)}
            >
              <span className="ws-toggle-switch__track">
                <span className="ws-toggle-switch__thumb" />
              </span>
              <span>Somente selecionados ({selectedItemsCount})</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={showFinalColumn}
              className={`ws-toggle-switch ${showFinalColumn ? "is-on" : ""}`}
              onClick={() => setShowFinalColumn((prev) => !prev)}
            >
              <span className="ws-toggle-switch__track">
                <span className="ws-toggle-switch__thumb" />
              </span>
              <span>Mostrar valor final (após a disputa)</span>
            </button>

            <button
              type="button"
              className="ws-toolbar-action"
              onClick={() => {
                setPricingDraft(pricingParams);
                setShowBulkCalc((prev) => !prev);
              }}
            >
              <Calculator size={15} />
              <span>Calculadora de preços</span>
            </button>
          </div>

          {showBulkCalc && (
            <div className="ws-calc-panel">
              <div className="ws-calc-panel__tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bulkMode === "cost"}
                  className={bulkMode === "cost" ? "is-active" : ""}
                  onClick={() => setBulkMode("cost")}
                >
                  Pelo custo
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bulkMode === "discount"}
                  className={bulkMode === "discount" ? "is-active" : ""}
                  onClick={() => setBulkMode("discount")}
                >
                  Por desconto
                </button>
              </div>

              {bulkMode === "cost" ? (
                <>
                  <p className="ws-calc-panel__hint">
                    Preencha a coluna <strong>Custo</strong> de cada item (quanto
                    você paga ao fornecedor ou gasta para produzir). O sistema
                    calcula o <strong>piso</strong> com a margem mínima e o{" "}
                    <strong>valor inicial</strong> com a margem desejada, sem
                    passar do valor estimado pelo órgão.
                  </p>
                  <div className="ws-calc-panel__fields">
                    {(
                      [
                        ["taxPct", "Impostos", "Alíquota efetiva do Simples / DAS"],
                        ["expensesPct", "Despesas", "Frete, embalagem, taxas"],
                        ["minMarginPct", "Margem mínima", "Define o piso de lance"],
                        ["targetMarginPct", "Margem desejada", "Define o valor inicial"],
                      ] as Array<[keyof PricingParams, string, string]>
                    ).map(([key, label, help]) => (
                      <label key={key} className="ws-calc-field">
                        <span>{label}</span>
                        <div className="ws-calc-field__input">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            step="0.1"
                            value={Number.isFinite(pricingDraft[key]) ? pricingDraft[key] : ""}
                            onChange={(e) =>
                              setPricingDraft((prev) => ({
                                ...prev,
                                [key]: e.target.value === "" ? Number.NaN : Number(e.target.value),
                              }))
                            }
                          />
                          <em>%</em>
                        </div>
                        <small>{help}</small>
                      </label>
                    ))}
                  </div>
                  <div className="ws-calc-panel__footer">
                    <span>
                      Percentuais sobre o preço de venda. Ex.: custo{" "}
                      <strong>R$ 30,00</strong> →{" "}
                      piso{" "}
                      <strong>
                        {formatCurrencyBr(
                          priceFromCost(
                            30,
                            pricingDraft.taxPct || 0,
                            pricingDraft.expensesPct || 0,
                            pricingDraft.minMarginPct || 0,
                          ),
                        )}
                      </strong>{" "}
                      e inicial{" "}
                      <strong>
                        {formatCurrencyBr(
                          priceFromCost(
                            30,
                            pricingDraft.taxPct || 0,
                            pricingDraft.expensesPct || 0,
                            pricingDraft.targetMarginPct || 0,
                          ),
                        )}
                      </strong>
                      .
                    </span>
                    <button
                      type="button"
                      className="ws-btn is-primary is-sm"
                      onClick={handleApplyCostPricing}
                    >
                      Calcular itens selecionados
                    </button>
                  </div>
                </>
              ) : (
                <div className="ws-bulk-calc-bar">
                  <span>
                    Definir <strong>Valor Mínimo (Piso)</strong> aplicando desconto
                    de
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={bulkMinMarginPct}
                    onChange={(e) => setBulkMinMarginPct(e.target.value)}
                  />
                  <span>
                    % abaixo do Valor Inicial (ou do estimado, se vazio) nos itens
                    selecionados.
                  </span>
                  <button
                    type="button"
                    className="ws-btn is-primary is-sm"
                    onClick={handleApplyBulkPricing}
                  >
                    Aplicar nos itens
                  </button>
                </div>
              )}
            </div>
          )}

          {showManualItemForm && (
            <form
              className="ws-inline-reminder-form"
              onSubmit={handleAddManualItem}
            >
              <input
                type="text"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Descrição do item conforme o Termo de Referência"
                required
              />
              <input
                type="number"
                min={1}
                step="any"
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                placeholder="Qtd."
              />
              <input
                type="text"
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                placeholder="Unid. (UN, CX, MÊS)"
              />
              <div className="ws-inline-actions">
                <button
                  type="button"
                  className="ws-btn is-ghost is-sm"
                  onClick={() => setShowManualItemForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="ws-btn is-primary is-sm">
                  Adicionar
                </button>
              </div>
            </form>
          )}

          {loadingDetail && workingItems.length === 0 ? (
            <div className="ws-select-modal__empty">
              <RefreshCw size={18} className="is-spinning" />
              <span>Carregando itens da licitação…</span>
            </div>
          ) : workingItems.length === 0 ? (
            <div className="ws-select-modal__empty">
              <FileSpreadsheet size={24} />
              <strong>Nenhum item estruturado retornado pelo PNCP</strong>
              <p>
                Clique em <strong>+ Item manual</strong> acima para cadastrar os
                itens constantes no PDF do Edital e montar sua proposta
                comercial.
              </p>
            </div>
          ) : (
            <div className="ws-pricing-table-wrap">
              <table className="ws-pricing-table">
                <thead>
                  <tr>
                    <th className="col-check" />
                    <th className="col-num">Item</th>
                    <th style={{ minWidth: 260 }}>Descrição</th>
                    <th className="col-right">Qtd.</th>
                    <th className="col-right">Valor Est.</th>
                    <th style={{ minWidth: 160 }}>Marca / Fabricante</th>
                    <th style={{ minWidth: 200 }}>Modelo / Versão</th>
                    <th style={{ minWidth: 120 }} title="Quanto você paga ou gasta por unidade">
                      Custo (R$)
                    </th>
                    <th style={{ minWidth: 130 }} title="Seu limite de lance — não aparece na proposta">
                      Valor Mínimo (R$)
                    </th>
                    <th style={{ minWidth: 155 }} title="Preço que vai na proposta inicial">
                      Valor Inicial (R$)
                    </th>
                    {showFinalColumn && (
                      <th style={{ minWidth: 155 }} title="Último lance / valor negociado">
                        Valor Final (R$)
                      </th>
                    )}
                    <th style={{ minWidth: 180 }}>Observações</th>
                    <th style={{ width: 34 }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkingItems.map((item) => (
                    <PricingItemRow
                      key={item.id}
                      item={item}
                      pricingParams={pricingParams}
                      showFinal={showFinalColumn}
                      onChange={(patch) =>
                        handleUpdateSingleItem(item.id, patch)
                      }
                      onDeleteManual={
                        item.isManual
                          ? () => handleDeleteManualItem(item.id)
                          : undefined
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Barra inferior: Valor total da proposta */}
          <div className="ws-proposal-totals">
            <div>
              <strong>Valor total da proposta</strong>
              <span>
                Considerando {selectedItemsCount}{" "}
                {selectedItemsCount === 1
                  ? "item selecionado"
                  : "itens selecionados"}
              </span>
            </div>

            <div className="ws-proposal-totals__values">
              <div className="ws-total-metric">
                <small>Valor Mínimo (Piso)</small>
                <strong>{formatCurrencyBr(proposalTotals.minTotal)}</strong>
              </div>
              <div className="ws-total-metric is-highlight">
                <small>Valor Inicial (Proposta)</small>
                <strong>{formatCurrencyBr(proposalTotals.initialTotal)}</strong>
              </div>
              {(showFinalColumn || proposalTotals.finalCount > 0) && (
                <div className="ws-total-metric is-final">
                  <small>
                    Valor Final ({proposalTotals.finalCount} arrematado
                    {proposalTotals.finalCount === 1 ? "" : "s"})
                  </small>
                  <strong>
                    {proposalTotals.finalTotal > 0
                      ? formatCurrencyBr(proposalTotals.finalTotal)
                      : "—"}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== ABA 3: HABILITAÇÃO ==================== */}
      {activeTab === "qualification" && (
        <div className="ws-tab-stack">
          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Documentos cadastrados da sua empresa</h2>
                <p>
                  Arquivos societários e comprovantes já vinculados ao seu CNPJ
                  no Compras Abertas.
                </p>
              </div>
            </div>

            <div className="ws-company-docs-grid">
              {companyDocs.map((doc) => (
                <div key={doc.title} className="ws-company-doc-item">
                  <CheckCircle2 size={18} className="ws-doc-ok-icon" />
                  <div>
                    <strong>{doc.title}</strong>
                    <small>{doc.url ? "Vinculado ao cadastro" : "Pendente"}</small>
                  </div>
                  {doc.url && (
                    <button
                      type="button"
                      className="ws-btn is-ghost is-sm"
                      onClick={() => openDocumentInNewTab(doc.url!, doc.title)}
                    >
                      Abrir
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Checklist de certidões e habilitação</h2>
                <p>
                  Marque os documentos já conferidos e controle a validade das
                  certidões exigidas no edital.
                </p>
              </div>
              <span className="ws-qual-pill">
                {checkedQualCount}/{qualificationList.length} prontos
              </span>
            </div>

            <div className="ws-qual-list">
              {qualificationList.map((q) => {
                const validity = describeCertValidity(q.dueDate);
                return (
                  <div
                    key={q.id}
                    className={`ws-qual-row ${q.checked ? "is-checked" : ""}`}
                  >
                    <button
                      type="button"
                      className={`ws-checkbox ${q.checked ? "is-checked" : ""}`}
                      onClick={() => toggleQualificationItem(q.id)}
                    >
                      {q.checked && <Check size={12} />}
                    </button>

                    <div className="ws-qual-row__info">
                      <strong>{q.title}</strong>
                      <span>{q.category}</span>
                    </div>

                    {validity && (
                      <span className={`ws-qual-validity is-${validity.tone}`}>
                        {validity.label}
                      </span>
                    )}

                    <label className="ws-qual-date">
                      <small>Validade:</small>
                      <input
                        type="date"
                        value={q.dueDate ?? ""}
                        onChange={(e) =>
                          updateQualificationDate(q.id, e.target.value)
                        }
                      />
                    </label>

                    {q.id.startsWith("custom-qual-") && (
                      <button
                        type="button"
                        className="ws-icon-btn"
                        onClick={() => removeCustomQualItem(q.id)}
                        title="Remover exigência"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              className="ws-inline-reminder-form"
              onSubmit={handleAddQualificationReq}
            >
              <input
                type="text"
                value={newQualTitle}
                onChange={(e) => setNewQualTitle(e.target.value)}
                placeholder="Adicionar exigência específica deste edital (ex: Alvará Sanitário, Registro CREA)…"
              />
              <Select
                value={newQualCategory}
                onValueChange={(v) => setNewQualCategory(v)}
              >
                <SelectTrigger aria-label="Categoria da exigência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Exigência do Edital">
                    Exigência do Edital
                  </SelectItem>
                  <SelectItem value="Qualificação Técnica">
                    Qualificação Técnica
                  </SelectItem>
                  <SelectItem value="Regularidade Fiscal">
                    Regularidade Fiscal
                  </SelectItem>
                  <SelectItem value="Declarações">Declarações</SelectItem>
                </SelectContent>
              </Select>
              <button type="submit" className="ws-btn is-primary is-sm">
                <Plus size={14} />
                Adicionar
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ==================== ABA 4: SESSÃO PÚBLICA ==================== */}
      {activeTab === "session" && (
        <div className="ws-bottom-split">
          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Cola rápida para a hora dos lances</h2>
                <p>
                  Consulte seus limites mínimos durante o pregão para nunca
                  ofertar abaixo do custo.
                </p>
              </div>
            </div>

            {selectedItemsCount === 0 ? (
              <p className="ws-muted-msg">
                Nenhum item selecionado ainda. Defina seus preços na aba{" "}
                <strong>Itens do edital</strong>.
              </p>
            ) : (
              <div className="ws-session-items">
                {workingItems
                  .filter((i) => i.selected)
                  .map((it) => (
                    <SessionItemCard
                      key={it.id}
                      item={it}
                      pricingParams={pricingParams}
                      onUpdateFinal={(finalUnitPrice) =>
                        handleUpdateSingleItem(it.id, { finalUnitPrice })
                      }
                    />
                  ))}
              </div>
            )}
          </section>

          <section className="ws-card">
            <div className="ws-card__header">
              <div>
                <h2>Registro da disputa e resultado</h2>
                <p>Anote sua colocação, negociação com o pregoeiro e ata.</p>
              </div>
            </div>

            <div className="ws-session-form">
              <div className="ws-field">
                <label>Colocação da empresa</label>
                <Select
                  value={tracked.metadata.placement || "__none__"}
                  onValueChange={(v) =>
                    onUpdateTracked(tracked.bidControlId, {
                      metadata: { placement: v === "__none__" ? "" : v },
                    })
                  }
                >
                  <SelectTrigger aria-label="Colocação da empresa">
                    <SelectValue placeholder="Aguardando disputa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aguardando disputa</SelectItem>
                    <SelectItem value="1º colocado (Arrematante)">
                      1º colocado (Arrematante / Vencedor)
                    </SelectItem>
                    <SelectItem value="2º colocado (Cadastro reserva)">
                      2º colocado (Próximo da fila)
                    </SelectItem>
                    <SelectItem value="3º colocado ou superior">
                      3º colocado ou superior
                    </SelectItem>
                    <SelectItem value="Inabilitado / Desclassificado">
                      Inabilitado / Desclassificado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ws-field">
                <label>Empresa vencedora (caso concorrente tenha ganho)</label>
                <input
                  type="text"
                  defaultValue={tracked.metadata.winnerName ?? ""}
                  onBlur={(e) =>
                    onUpdateTracked(tracked.bidControlId, {
                      metadata: { winnerName: e.target.value },
                    })
                  }
                  placeholder="Nome e valor do concorrente para histórico de preços"
                />
              </div>

              <div className="ws-field">
                <label>Anotações da sessão pública / recursos</label>
                <textarea
                  rows={5}
                  defaultValue={tracked.metadata.sessionNotes ?? ""}
                  onBlur={(e) =>
                    onUpdateTracked(tracked.bidControlId, {
                      metadata: { sessionNotes: e.target.value },
                    })
                  }
                  placeholder="Registre mensagens do chat do pregoeiro, prazos de envio de proposta readequada ou pontos para recurso administrativo…"
                />
              </div>

              <div className="ws-inline-actions">
                <button
                  type="button"
                  className="ws-btn is-primary is-sm"
                  onClick={() => {
                    onUpdateTracked(tracked.bidControlId, {
                      stage: "homologada",
                    });
                    toast.success("Movida para Homologada!");
                  }}
                >
                  <Check size={14} />
                  Marcar como Homologada
                </button>
                <button
                  type="button"
                  className="ws-btn is-ghost is-sm"
                  onClick={() => handleGenerateProposal("ajustada")}
                >
                  <Printer size={14} />
                  Emitir Proposta Ajustada
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {proposalModalMode !== null && (
        <GenerateProposalModal
          tracked={tracked}
          items={workingItems}
          company={proposalCompany}
          isServiceBid={isServiceBid}
          initialMode={proposalModalMode}
          onClose={() => setProposalModalMode(null)}
        />
      )}
    </div>
  );
}

function describeCertValidity(dueDate: string | null): {
  label: string;
  tone: "expired" | "soon" | "ok";
} | null {
  if (!dueDate) return null;
  const target = new Date(`${dueDate}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diffDays = Math.round(
    (startDue.getTime() - startToday.getTime()) / 86_400_000,
  );
  if (diffDays < 0) return { label: "Vencida", tone: "expired" };
  if (diffDays === 0) return { label: "Vence hoje", tone: "soon" };
  if (diffDays <= 7) return { label: `Vence em ${diffDays}d`, tone: "soon" };
  return { label: "Válida", tone: "ok" };
}

function formatDecimalBr(value: number | null | undefined): string {
  return value !== null && value !== undefined
    ? value.toFixed(2).replace(".", ",")
    : "";
}

function SessionItemCard({
  item,
  pricingParams,
  onUpdateFinal,
}: {
  item: TrackedBidItem;
  pricingParams: PricingParams;
  onUpdateFinal: (finalUnitPrice: number | null) => void;
}) {
  const [finalStr, setFinalStr] = useState(() =>
    formatDecimalBr(item.finalUnitPrice),
  );

  useEffect(() => {
    setFinalStr(formatDecimalBr(item.finalUnitPrice));
  }, [item.finalUnitPrice]);

  const finalMargin = netMarginPct(
    item.finalUnitPrice,
    item.unitCost,
    pricingParams,
  );
  const isBelowFloor =
    Boolean(item.finalUnitPrice && item.finalUnitPrice > 0) &&
    Boolean(item.minUnitPrice && item.minUnitPrice > 0) &&
    (item.finalUnitPrice as number) < (item.minUnitPrice as number) - 0.004;

  return (
    <div className="ws-session-item-card">
      <div className="ws-session-item-card__top">
        <strong>Item {item.itemNumber}</strong>
        <span>
          {(item.quantity ?? 1).toLocaleString("pt-BR")} {item.unit || "UN"}
        </span>
      </div>
      <p>{item.description}</p>
      <div className="ws-session-item-card__prices is-three">
        <div>
          <small>Proposta Inicial</small>
          <strong>
            {item.initialUnitPrice
              ? formatCurrencyBr(item.initialUnitPrice)
              : "—"}
          </strong>
        </div>
        <div className="is-floor">
          <small>Piso Mínimo Unitário</small>
          <strong>
            {item.minUnitPrice
              ? formatCurrencyBr(item.minUnitPrice)
              : "Não definido"}
          </strong>
        </div>
        <div className="ws-session-final-box">
          <small>Valor Final Arrematado (R$)</small>
          <input
            type="text"
            inputMode="decimal"
            className={`ws-cell-input is-money ${isBelowFloor ? "is-warn" : ""}`}
            value={finalStr}
            onChange={(e) => setFinalStr(e.target.value)}
            onBlur={() => {
              const parsed = parseMoneyInput(finalStr);
              if (parsed !== (item.finalUnitPrice ?? null)) {
                onUpdateFinal(parsed);
              }
            }}
            placeholder="Ex: 42,50"
          />
          {finalMargin !== null && (
            <span
              className={`ws-cell-sub ${finalMargin < 0 ? "is-danger" : finalMargin < pricingParams.minMarginPct ? "is-warn" : "is-ok"}`}
            >
              Margem líq.: {finalMargin.toFixed(1).replace(".", ",")}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PricingItemRow({
  item,
  pricingParams,
  showFinal,
  onChange,
  onDeleteManual,
}: {
  item: TrackedBidItem;
  pricingParams: PricingParams;
  showFinal: boolean;
  onChange: (patch: Partial<TrackedBidItem>) => void;
  onDeleteManual?: () => void;
}) {
  const [brand, setBrand] = useState(item.brand);
  const [model, setModel] = useState(item.model);
  const [costStr, setCostStr] = useState(() => formatDecimalBr(item.unitCost));
  const [minStr, setMinStr] = useState(() => formatDecimalBr(item.minUnitPrice));
  const [initStr, setInitStr] = useState(() =>
    formatDecimalBr(item.initialUnitPrice),
  );
  const [finalStr, setFinalStr] = useState(() =>
    formatDecimalBr(item.finalUnitPrice),
  );
  const [notes, setNotes] = useState(item.notes);

  useEffect(() => {
    setBrand(item.brand);
    setModel(item.model);
    setCostStr(formatDecimalBr(item.unitCost));
    setMinStr(formatDecimalBr(item.minUnitPrice));
    setInitStr(formatDecimalBr(item.initialUnitPrice));
    setFinalStr(formatDecimalBr(item.finalUnitPrice));
    setNotes(item.notes);
  }, [
    item.brand,
    item.finalUnitPrice,
    item.initialUnitPrice,
    item.minUnitPrice,
    item.model,
    item.notes,
    item.unitCost,
  ]);

  const initMargin = netMarginPct(
    item.initialUnitPrice,
    item.unitCost,
    pricingParams,
  );
  const finalMargin = netMarginPct(
    item.finalUnitPrice,
    item.unitCost,
    pricingParams,
  );

  const aboveEst =
    !item.confidentialBudget &&
    Boolean(item.estimatedUnitValue && item.estimatedUnitValue > 0) &&
    Boolean(item.initialUnitPrice && item.initialUnitPrice > 0) &&
    (item.initialUnitPrice as number) >
      (item.estimatedUnitValue as number) + 0.004;

  const belowFloor =
    Boolean(item.minUnitPrice && item.minUnitPrice > 0) &&
    Boolean(item.initialUnitPrice && item.initialUnitPrice > 0) &&
    (item.initialUnitPrice as number) < (item.minUnitPrice as number) - 0.004;

  return (
    <tr className={item.selected ? "is-selected-row" : "is-unselected-row"}>
      <td className="col-check">
        <button
          type="button"
          className={`ws-checkbox ${item.selected ? "is-checked" : ""}`}
          onClick={() => onChange({ selected: !item.selected })}
          aria-label={`Selecionar item ${item.itemNumber}`}
        >
          {item.selected && <Check size={12} />}
        </button>
      </td>

      <td className="col-num">
        <strong>{item.itemNumber}</strong>
      </td>

      <td>
        <div className="ws-pricing-desc">
          <span>{item.description}</span>
          <small>
            {(item.quantity ?? 1).toLocaleString("pt-BR")} {item.unit || "UN"}
          </small>
        </div>
      </td>

      <td className="col-right">
        {(item.quantity ?? 1).toLocaleString("pt-BR")}
      </td>

      <td className="col-right col-muted">
        {item.confidentialBudget
          ? "Sigiloso"
          : item.estimatedUnitValue && item.estimatedUnitValue > 0
            ? formatCurrencyBr(item.estimatedUnitValue)
            : "Sigiloso"}
      </td>

      <td>
        <input
          type="text"
          className="ws-cell-input"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          onBlur={() => {
            if (brand !== item.brand) onChange({ brand });
          }}
          placeholder="Marca"
        />
      </td>

      <td>
        <input
          type="text"
          className="ws-cell-input"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onBlur={() => {
            if (model !== item.model) onChange({ model });
          }}
          placeholder="Modelo"
        />
      </td>

      <td>
        <input
          type="text"
          inputMode="decimal"
          className="ws-cell-input is-money"
          value={costStr}
          onChange={(e) => setCostStr(e.target.value)}
          onBlur={() => {
            const parsed = parseMoneyInput(costStr);
            if (parsed !== (item.unitCost ?? null)) {
              onChange({ unitCost: parsed });
            }
          }}
          placeholder="0,00"
        />
      </td>

      <td>
        <input
          type="text"
          inputMode="decimal"
          className="ws-cell-input is-money"
          value={minStr}
          onChange={(e) => setMinStr(e.target.value)}
          onBlur={() => {
            const parsed = parseMoneyInput(minStr);
            if (parsed !== item.minUnitPrice) {
              onChange({ minUnitPrice: parsed });
            }
          }}
          placeholder="0,00"
        />
      </td>

      <td>
        <div className="ws-cell-stack">
          <input
            type="text"
            inputMode="decimal"
            className={`ws-cell-input is-money ${aboveEst || belowFloor ? "is-warn" : ""}`}
            value={initStr}
            onChange={(e) => setInitStr(e.target.value)}
            onBlur={() => {
              const parsed = parseMoneyInput(initStr);
              if (parsed !== item.initialUnitPrice) {
                onChange({ initialUnitPrice: parsed });
              }
            }}
            placeholder="0,00"
          />
          {aboveEst ? (
            <span className="ws-cell-sub is-danger">Acima do estimado</span>
          ) : belowFloor ? (
            <span className="ws-cell-sub is-warn">Abaixo do piso</span>
          ) : initMargin !== null ? (
            <span
              className={`ws-cell-sub ${initMargin < 0 ? "is-danger" : initMargin < pricingParams.minMarginPct ? "is-warn" : "is-ok"}`}
            >
              Margem: {initMargin.toFixed(1).replace(".", ",")}%
            </span>
          ) : null}
        </div>
      </td>

      {showFinal && (
        <td>
          <div className="ws-cell-stack">
            <input
              type="text"
              inputMode="decimal"
              className="ws-cell-input is-money"
              value={finalStr}
              onChange={(e) => setFinalStr(e.target.value)}
              onBlur={() => {
                const parsed = parseMoneyInput(finalStr);
                if (parsed !== (item.finalUnitPrice ?? null)) {
                  onChange({ finalUnitPrice: parsed });
                }
              }}
              placeholder="0,00"
            />
            {finalMargin !== null && (
              <span
                className={`ws-cell-sub ${finalMargin < 0 ? "is-danger" : finalMargin < pricingParams.minMarginPct ? "is-warn" : "is-ok"}`}
              >
                Margem: {finalMargin.toFixed(1).replace(".", ",")}%
              </span>
            )}
          </div>
        </td>
      )}

      <td>
        <input
          type="text"
          className="ws-cell-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== item.notes) onChange({ notes });
          }}
          placeholder="Obs. do item"
        />
      </td>

      <td>
        {onDeleteManual && (
          <button
            type="button"
            className="ws-icon-btn"
            onClick={onDeleteManual}
            title="Remover item manual"
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}
