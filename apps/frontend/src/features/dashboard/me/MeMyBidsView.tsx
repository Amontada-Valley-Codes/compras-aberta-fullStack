"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calculator,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { CompanyMatchProfile, EnrichedMeBid } from "./cnae-match";
import {
  formatCleanTitle,
  formatCurrencyBr,
  formatDateBr,
  formatOrgName,
} from "./bid-formatters";
import type { WorkspaceSubTab } from "./MeBidWorkspace";
import { useMeBidDetailQuery } from "./use-me-licitacoes";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  enrichSnapshotBid,
  STAGE_MAP,
  toLocalDateKey,
  type CalendarEventItem,
  type TrackedBid,
} from "./workspace-types";

type StageFilter = "todas" | "analise" | "disputa" | "concluidas";
type MyBidsSort = "opening" | "recent" | "value";

const ESSENTIAL_STAGES: Array<{
  id: StageFilter;
  label: string;
  tone: string;
}> = [
  { id: "todas", label: "Todas", tone: "blue" },
  { id: "analise", label: "Em Análise", tone: "blue" },
  { id: "disputa", label: "Disputa / Proposta", tone: "indigo" },
  { id: "concluidas", label: "Concluídas", tone: "emerald" },
];

export interface MeMyBidsViewProps {
  trackedBids: TrackedBid[];
  calendarEvents: CalendarEventItem[];
  liveBidsMap: Map<string, EnrichedMeBid>;
  companyMatchProfile: CompanyMatchProfile;
  onManageBid: (bidControlId: string, initialTab?: WorkspaceSubTab) => void;
  onSelectItemsForBid: (bid: EnrichedMeBid) => void;
  onOpenChat: (bid: EnrichedMeBid) => void;
  onUpdateTrackedTags: (bidControlId: string, tags: string[]) => Promise<unknown>;
  onUpdateTrackedNotes: (bidControlId: string, notes: string) => Promise<unknown>;
  onRemoveTracked: (bidControlId: string) => Promise<void>;
  onNavigateRadar: () => void;
  onNavigateAgenda: () => void;
}

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function MeMyBidsView({
  trackedBids,
  calendarEvents,
  liveBidsMap,
  companyMatchProfile,
  onManageBid,
  onSelectItemsForBid,
  onOpenChat,
  onUpdateTrackedTags,
  onUpdateTrackedNotes,
  onRemoveTracked,
  onNavigateRadar,
  onNavigateAgenda,
}: MeMyBidsViewProps) {
  const [stageFilter, setStageFilter] = useState<StageFilter>(() => {
    if (
      trackedBids.some(
        (t) =>
          t.stage === "proposta" ||
          t.stage === "lance" ||
          t.stage === "sessao",
      )
    )
      return "disputa";
    if (trackedBids.some((t) => t.stage === "analise")) return "analise";
    return "todas";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortBy, setSortBy] = useState<MyBidsSort>("opening");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Estado do mini calendário
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const stageCounts = useMemo(() => {
    let analise = 0;
    let disputa = 0;
    let concluidas = 0;
    for (const tb of trackedBids) {
      if (tb.stage === "analise") {
        analise += 1;
      } else if (
        tb.stage === "proposta" ||
        tb.stage === "lance" ||
        tb.stage === "sessao"
      ) {
        disputa += 1;
      } else if (tb.stage === "homologada" || tb.stage === "desistida") {
        concluidas += 1;
      }
    }
    return {
      todas: trackedBids.length,
      analise,
      disputa,
      concluidas,
    };
  }, [trackedBids]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const tb of trackedBids) {
      for (const tg of tb.tags) set.add(tg);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [trackedBids]);

  const allModalities = useMemo(() => {
    const set = new Set<string>();
    for (const tb of trackedBids) {
      if (tb.bidSnapshot.modality) set.add(tb.bidSnapshot.modality);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [trackedBids]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = trackedBids.filter((tb) => {
      if (stageFilter === "analise" && tb.stage !== "analise") {
        return false;
      }
      if (
        stageFilter === "disputa" &&
        tb.stage !== "proposta" &&
        tb.stage !== "lance" &&
        tb.stage !== "sessao"
      ) {
        return false;
      }
      if (
        stageFilter === "concluidas" &&
        tb.stage !== "homologada" &&
        tb.stage !== "desistida"
      ) {
        return false;
      }
      if (tagFilter && !tb.tags.includes(tagFilter)) {
        return false;
      }
      if (modalityFilter && tb.bidSnapshot.modality !== modalityFilter) {
        return false;
      }
      if (selectedDateKey) {
        const openIso = tb.bidSnapshot.closingAt || tb.bidSnapshot.openingAt;
        const openKey = openIso ? toLocalDateKey(openIso) : null;
        const sessKey = tb.metadata.publicSessionAt
          ? toLocalDateKey(tb.metadata.publicSessionAt)
          : null;
        if (openKey !== selectedDateKey && sessKey !== selectedDateKey) {
          return false;
        }
      }
      if (q) {
        const snap = tb.bidSnapshot;
        const hay = [
          tb.nickname ?? "",
          snap.purchaseNumber ?? "",
          snap.object ?? "",
          snap.agencyName ?? "",
          snap.unitName ?? "",
          snap.city ?? "",
          tb.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "recent") {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      if (sortBy === "value") {
        const va = a.bidSnapshot.estimatedValue ?? 0;
        const vb = b.bidSnapshot.estimatedValue ?? 0;
        return vb - va;
      }
      // Abertura mais próxima
      const da =
        a.bidSnapshot.closingAt ||
        a.bidSnapshot.openingAt ||
        "9999-12-31T00:00:00Z";
      const db =
        b.bidSnapshot.closingAt ||
        b.bidSnapshot.openingAt ||
        "9999-12-31T00:00:00Z";
      return da.localeCompare(db);
    });

    return list;
  }, [
    modalityFilter,
    searchQuery,
    selectedDateKey,
    sortBy,
    stageFilter,
    tagFilter,
    trackedBids,
  ]);

  // Mapeia eventos por dia para o Mini Calendário
  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of calendarEvents) {
      const arr = map.get(ev.dateKey) ?? [];
      arr.push(ev);
      map.set(ev.dateKey, arr);
    }
    return map;
  }, [calendarEvents]);

  const miniCalDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    const cells: Array<{
      day: number;
      dateKey: string;
      inMonth: boolean;
    }> = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth - 1, prevMonthDays - i);
      cells.push({
        day: d.getDate(),
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      cells.push({
        day,
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - (startWeekday + daysInMonth) + 1;
      const d = new Date(calYear, calMonth + 1, nextIdx);
      cells.push({
        day: d.getDate(),
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: false,
      });
    }

    return cells;
  }, [calMonth, calYear]);

  const todayKey = toLocalDateKey(now);

  const changeMiniMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  return (
    <div className="mybids-page">
      {/* Cabeçalho */}
      <header className="mybids-page__header">
        <div>
          <h1>Minhas licitações</h1>
          <p>
            Gerencie e acompanhe as licitações que está analisando ou
            participando, com acesso a datas, propostas e detalhes de cada item.
          </p>
        </div>
      </header>

      {/* Abas de Fase do Funil */}
      <nav className="mybids-stage-tabs" aria-label="Fases das licitações">
        {ESSENTIAL_STAGES.map((st) => {
          const count = stageCounts[st.id];
          return (
            <button
              key={st.id}
              type="button"
              className={`mybids-stage-tab ${stageFilter === st.id ? "is-active" : ""}`}
              onClick={() => setStageFilter(st.id)}
            >
              <span>{st.label}</span>
              {count > 0 && <em className={`tone-${st.tone}`}>{count}</em>}
            </button>
          );
        })}
      </nav>

      {/* Barra de Busca e Ordenação */}
      <div className="mybids-toolbar">
        <div className="mybids-toolbar__left">
          <label className="ws-search-input">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar licitação, apelido ou órgão…"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </label>

          {allTags.length > 0 && (
            <Select
              value={tagFilter || "__all__"}
              onValueChange={(v) => setTagFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger
                className="mybids-filter-select"
                aria-label="Filtrar por tag"
              >
                <SelectValue placeholder="Tags: Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tags: Todas</SelectItem>
                {allTags.map((tg) => (
                  <SelectItem key={tg} value={tg}>
                    Tag: {tg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedDateKey && (
            <button
              type="button"
              className="mybids-date-chip"
              onClick={() => setSelectedDateKey(null)}
            >
              <span>
                Data: {selectedDateKey.split("-").reverse().join("/")}
              </span>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="mybids-toolbar__right">
          <PublicFilterSelect
            name="mybids-ordenar"
            label="Ordenar por"
            icon="sort"
            variant="dashboard"
            value={sortBy}
            options={[
              { value: "opening", label: "Abertura mais próxima" },
              { value: "recent", label: "Atualizadas recentemente" },
              { value: "value", label: "Maior valor estimado" },
            ]}
            onValueChange={(val) => setSortBy((val as MyBidsSort) || "opening")}
          />
        </div>
      </div>

      {/* Layout Principal: Feed + Mini Calendário Lateral */}
      <div className="mybids-layout">
        <div className="mybids-feed">
          {trackedBids.length === 0 ? (
            <div className="mybids-empty">
              <FolderKanban size={30} />
              <h3>Nenhuma licitação acompanhada ainda</h3>
              <p>
                No <strong>Radar de Licitações</strong>, clique em{" "}
                <strong>Participar</strong> para escolher os itens que deseja
                fornecer ou em <strong>Salvar para análise</strong> para avaliar
                o edital aqui.
              </p>
              <button
                type="button"
                className="ws-btn is-primary"
                onClick={onNavigateRadar}
              >
                Explorar Radar de Licitações
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="mybids-empty">
              <h3>Nenhuma licitação nesta fase ou filtro</h3>
              <p>
                Altere a aba selecionada acima ou limpe os filtros de pesquisa
                para visualizar suas licitações salvas.
              </p>
              <button
                type="button"
                className="ws-btn is-ghost"
                onClick={() => {
                  setStageFilter("todas");
                  setSearchQuery("");
                  setTagFilter("");
                  setModalityFilter("");
                  setSelectedDateKey(null);
                }}
              >
                Mostrar todas ({trackedBids.length})
              </button>
            </div>
          ) : (
            filteredList.map((tb) => {
              const enriched = enrichSnapshotBid(
                tb.bidSnapshot,
                companyMatchProfile,
                liveBidsMap.get(tb.bidControlId),
              );
              return (
                <TrackedBidCard
                  key={tb.bidControlId}
                  tracked={tb}
                  bid={enriched}
                  onManage={(tab) => onManageBid(tb.bidControlId, tab)}
                  onSelectItems={() => onSelectItemsForBid(enriched)}
                  onOpenChat={() => onOpenChat(enriched)}
                  onUpdateTags={(tags) =>
                    onUpdateTrackedTags(tb.bidControlId, tags)
                  }
                  onUpdateNotes={(notes) =>
                    onUpdateTrackedNotes(tb.bidControlId, notes)
                  }
                  onRemove={() => onRemoveTracked(tb.bidControlId)}
                />
              );
            })
          )}
        </div>

        {/* Coluna Direita: Mini Calendário + Filtros rápidos */}
        <aside className="mybids-aside">
          <div className="mybids-minical">
            <div className="mybids-minical__head">
              <button
                type="button"
                onClick={() => changeMiniMonth(-1)}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <strong>
                {MONTHS_PT[calMonth]} {calYear}
              </strong>
              <button
                type="button"
                onClick={() => changeMiniMonth(1)}
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mybids-minical__weekdays">
              {WEEKDAYS_PT.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="mybids-minical__grid">
              {miniCalDays.map((cell, idx) => {
                const dayEvents = eventsByDateKey.get(cell.dateKey) ?? [];
                const hasOpening = dayEvents.some((e) => e.type === "abertura");
                const hasSession = dayEvents.some((e) => e.type === "sessao");
                const hasReminder = dayEvents.some(
                  (e) => e.type === "lembrete" || e.type === "prazo",
                );
                const isSelected = selectedDateKey === cell.dateKey;
                const isToday = todayKey === cell.dateKey;

                return (
                  <button
                    key={`${cell.dateKey}-${idx}`}
                    type="button"
                    className={`mybids-minical__day ${!cell.inMonth ? "is-out" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                    onClick={() =>
                      setSelectedDateKey((prev) =>
                        prev === cell.dateKey ? null : cell.dateKey,
                      )
                    }
                  >
                    <span>{cell.day}</span>
                    {(hasOpening || hasSession || hasReminder) && (
                      <i className="mybids-minical__dots">
                        {hasOpening && <b className="dot-open" />}
                        {hasSession && <b className="dot-session" />}
                        {hasReminder && <b className="dot-rem" />}
                      </i>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mybids-minical__legend">
              <span>
                <b className="dot-open" /> Abertura
              </span>
              <span>
                <b className="dot-session" /> Sessão pública
              </span>
              <span>
                <b className="dot-rem" /> Lembretes
              </span>
            </div>

            <button
              type="button"
              className="mybids-minical__agenda-btn"
              onClick={onNavigateAgenda}
            >
              <CalendarIcon size={14} />
              <span>Abrir Agenda completa</span>
            </button>
          </div>

          {allModalities.length > 0 && (
            <div className="mybids-side-filter">
              <h3>Filtros de pesquisa</h3>
              <label>
                <span>Modalidade</span>
                <Select
                  value={modalityFilter || "__all__"}
                  onValueChange={(v) =>
                    setModalityFilter(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger aria-label="Filtrar por modalidade">
                    <SelectValue placeholder="Todas as modalidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      Todas as modalidades
                    </SelectItem>
                    {allModalities.map((mod) => (
                      <SelectItem key={mod} value={mod}>
                        {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TrackedBidCard({
  tracked,
  bid,
  onManage,
  onSelectItems,
  onOpenChat,
  onUpdateTags,
  onUpdateNotes,
  onRemove,
}: {
  tracked: TrackedBid;
  bid: EnrichedMeBid;
  onManage: (initialTab?: WorkspaceSubTab) => void;
  onSelectItems: () => void;
  onOpenChat: () => void;
  onUpdateTags: (tags: string[]) => Promise<unknown>;
  onUpdateNotes: (notes: string) => Promise<unknown>;
  onRemove: () => Promise<void>;
}) {
  const [cardTab, setCardTab] = useState<"details" | "files" | "notes">(
    "details",
  );
  const [itemsOpen, setItemsOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState(tracked.notes);

  const { data: detailData, isLoading: loadingDetail } = useMeBidDetailQuery({
    agencyCnpj: bid.agencyCnpj,
    year: bid.year,
    sequential: bid.sequential,
    enabled: cardTab === "files" || (itemsOpen && tracked.items.length === 0),
  });

  const orgShort = formatOrgName(bid.unitName || bid.agencyName);
  const headline = `${(bid.modality || "LICITAÇÃO").toUpperCase()} ${bid.purchaseNumber || `${bid.sequential}/${bid.year}`} — ${orgShort.toUpperCase()}`;
  const stageDef = STAGE_MAP[tracked.stage] ?? STAGE_MAP.analise;
  const selectedCount = tracked.items.filter((i) => i.selected).length;

  const commitTag = async () => {
    const clean = tagDraft.trim();
    if (clean && !tracked.tags.includes(clean)) {
      await onUpdateTags([...tracked.tags, clean]);
    }
    setTagDraft("");
    setAddingTag(false);
  };

  return (
    <article className="mybids-card">
      <div className="mybids-card__top">
        <div className="mybids-card__pills">
          <span className="ws-org-pill">
            <Building2 size={13} />
            {orgShort}
          </span>
          <span className={`ws-stage-pill tone-${stageDef.tone}`}>
            {stageDef.label}
          </span>
          {tracked.customStatus && (
            <span className="ws-status-pill">{tracked.customStatus}</span>
          )}
          {selectedCount > 0 && (
            <span className="ws-items-count-pill">
              {selectedCount}{" "}
              {selectedCount === 1 ? "item selecionado" : "itens selecionados"}
            </span>
          )}
        </div>

        <div className="mybids-card__top-right">
          <a
            href={bid.portalUrl || bid.pncpGovUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-icon-btn"
            title="Abrir no portal externo"
          >
            <ExternalLink size={15} />
          </a>
          <button
            type="button"
            className="ws-icon-btn"
            onClick={onRemove}
            title="Remover de Minhas Licitações"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="mybids-card__title"
        onClick={() => onManage("overview")}
      >
        {tracked.nickname ? `${tracked.nickname} • ${headline}` : headline}
      </button>

      {/* Sub-abas internas do card */}
      <div className="me-bid-card__tabs">
        <button
          type="button"
          className={`me-bid-card__tab ${cardTab === "details" ? "is-active" : ""}`}
          onClick={() => setCardTab("details")}
        >
          Detalhes
        </button>
        <button
          type="button"
          className={`me-bid-card__tab ${cardTab === "files" ? "is-active" : ""}`}
          onClick={() => setCardTab("files")}
        >
          Arquivos
        </button>
        <button
          type="button"
          className={`me-bid-card__tab ${cardTab === "notes" ? "is-active" : ""}`}
          onClick={() => setCardTab("notes")}
        >
          Observações
        </button>
      </div>

      {cardTab === "details" && (
        <div className="me-bid-card__panel">
          <p className="me-bid-card__object">{formatCleanTitle(bid.object)}</p>
          <div className="me-bid-card__meta-grid">
            <div>
              <span>Publicação</span>{" "}
              <strong>{formatDateBr(bid.publishedAt, false)}</strong>
            </div>
            <div>
              <span>Modo de disputa</span>{" "}
              <strong>{bid.disputeMode || "Conforme Edital"}</strong>
            </div>
            <div>
              <span>Total estimado</span>{" "}
              <strong>
                {bid.confidentialBudget
                  ? "Sigiloso"
                  : bid.estimatedValue && bid.estimatedValue > 0
                    ? formatCurrencyBr(bid.estimatedValue)
                    : "Sigiloso"}
              </strong>
            </div>
            <div>
              <span>Abertura</span>{" "}
              <strong>
                {formatDateBr(bid.closingAt || bid.openingAt, true)}
              </strong>
            </div>
            <div>
              <span>Registro de preço</span>{" "}
              <strong>{bid.srp ? "Sim" : "Não"}</strong>
            </div>
            <div>
              <span>Cidade</span>{" "}
              <strong>
                {bid.city}/{bid.uf}
              </strong>
            </div>
          </div>
        </div>
      )}

      {cardTab === "files" && (
        <div className="me-bid-card__panel">
          {loadingDetail ? (
            <p className="ws-muted-msg">Buscando arquivos no PNCP…</p>
          ) : (detailData?.documents ?? []).length === 0 ? (
            <p className="ws-muted-msg">
              Consulte os arquivos diretamente na sala do portal.
            </p>
          ) : (
            <div className="ws-files-list">
              {(detailData?.documents ?? []).map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ws-file-row"
                >
                  <FileText size={15} />
                  <div>
                    <strong>{doc.title}</strong>
                    <small>{doc.typeName}</small>
                  </div>
                  <Download size={14} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {cardTab === "notes" && (
        <div className="me-bid-card__panel">
          <textarea
            className="mybids-card__notes-area"
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              if (notesDraft !== tracked.notes) {
                onUpdateNotes(notesDraft);
              }
            }}
            placeholder="Anote observações rápidas sobre esta licitação…"
          />
        </div>
      )}

      {/* Botões de Ação */}
      <div className="mybids-card__actions">
        <button
          type="button"
          className="ws-btn is-primary"
          onClick={() => onManage("overview")}
        >
          Gerenciar
        </button>

        {tracked.stage === "analise" && selectedCount === 0 ? (
          <button
            type="button"
            className="ws-btn is-ghost"
            onClick={onSelectItems}
          >
            <ListChecks size={15} />
            <span>Selecionar itens</span>
          </button>
        ) : (
          <button
            type="button"
            className="ws-btn is-ghost"
            onClick={() => onManage("items")}
          >
            <Calculator size={15} />
            <span>Precificar itens</span>
          </button>
        )}

        <button
          type="button"
          className="ws-btn is-ghost"
          onClick={onOpenChat}
        >
          <Sparkles size={15} />
          <span>Converse com o edital</span>
        </button>
      </div>

      {/* Tags rápidas */}
      <div className="mybids-card__tags-row">
        {tracked.tags.map((tag) => (
          <span key={tag} className="ws-tag-chip">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() =>
                onUpdateTags(tracked.tags.filter((t) => t !== tag))
              }
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
            onBlur={commitTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTag();
              }
              if (e.key === "Escape") setAddingTag(false);
            }}
            placeholder="Digite a tag…"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="mybids-add-tag-link"
            onClick={() => setAddingTag(true)}
          >
            <Plus size={12} /> Adicionar tag
          </button>
        )}
      </div>

      {/* Gaveta de itens */}
      <div className="mybids-card__drawer">
        <button
          type="button"
          className="me-bid-card__items-toggle"
          onClick={() => setItemsOpen((prev) => !prev)}
        >
          {itemsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          <span>
            {itemsOpen
              ? "Recolher itens"
              : selectedCount > 0
                ? `Ver itens selecionados (${selectedCount})`
                : "Ver itens do edital"}
          </span>
        </button>

        {itemsOpen && (
          <div className="mybids-card__drawer-body">
            {tracked.items.filter((i) => i.selected).length > 0 ? (
              <div className="mybids-mini-items">
                {tracked.items
                  .filter((i) => i.selected)
                  .map((it) => (
                    <div key={it.id} className="mybids-mini-item">
                      <strong>Item {it.itemNumber}</strong>
                      <span>{it.description}</span>
                      <em>
                        {(it.quantity ?? 1).toLocaleString("pt-BR")}{" "}
                        {it.unit || "UN"}
                      </em>
                      <b>
                        {it.initialUnitPrice
                          ? formatCurrencyBr(it.initialUnitPrice)
                          : "Sem preço"}
                      </b>
                    </div>
                  ))}
              </div>
            ) : loadingDetail ? (
              <p className="ws-muted-msg">Carregando itens…</p>
            ) : (detailData?.items ?? []).length === 0 ? (
              <p className="ws-muted-msg">
                Itens detalhados no arquivo PDF do edital.
              </p>
            ) : (
              <div className="mybids-mini-items">
                {(detailData?.items ?? []).slice(0, 6).map((it) => (
                  <div key={it.number} className="mybids-mini-item">
                    <strong>Item {it.number}</strong>
                    <span>{it.description}</span>
                    <em>
                      {(it.quantity ?? 1).toLocaleString("pt-BR")}{" "}
                      {it.unit || "UN"}
                    </em>
                    <b>
                      {it.confidentialBudget
                        ? "Sigiloso"
                        : it.unitValue
                          ? formatCurrencyBr(it.unitValue)
                          : "—"}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
