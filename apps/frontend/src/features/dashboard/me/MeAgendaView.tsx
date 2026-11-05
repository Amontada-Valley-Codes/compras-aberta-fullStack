"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  List,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  parseAnyDate,
  toLocalDateKey,
  type AgendaEventType,
  type AgendaReminder,
  type CalendarEventItem,
  type TrackedBid,
} from "./workspace-types";

type AgendaFilter = "all" | "abertura" | "sessao" | "lembrete";
type AgendaViewMode = "calendar" | "list";

export interface MeAgendaViewProps {
  trackedBids: TrackedBid[];
  calendarEvents: CalendarEventItem[];
  onOpenBidWorkspace: (bidControlId: string) => void;
  onCreateReminder: (input: {
    title: string;
    description?: string;
    dueAt: string;
    type?: AgendaEventType;
    trackedBidId?: string | null;
  }) => Promise<AgendaReminder>;
  onUpdateReminder: (
    id: string,
    patch: Partial<Pick<AgendaReminder, "completed">>,
  ) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
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

const MONTHS_SHORT_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatRelativeDue(dueAtIso: string): { label: string; isUrgent: boolean } {
  const d = parseAnyDate(dueAtIso);
  if (!d) return { label: "", isUrgent: false };
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return { label: "Hoje!", isUrgent: true };
  if (diffDays === 1) return { label: "Amanhã", isUrgent: true };
  if (diffDays === -1) return { label: "Ontem", isUrgent: false };
  if (diffDays < -1) return { label: `Encerrado há ${Math.abs(diffDays)} dias`, isUrgent: false };
  if (diffDays <= 3) return { label: `Em ${diffDays} dias`, isUrgent: true };
  if (diffDays < 30) return { label: `Em ${diffDays} dias`, isUrgent: false };
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths === 1) return { label: "Em 1 mês", isUrgent: false };
  if (diffMonths < 12) return { label: `Em ${diffMonths} meses`, isUrgent: false };
  const diffYears = (diffDays / 365).toFixed(1).replace(".0", "");
  return { label: `Em ${diffYears} ano(s)`, isUrgent: false };
}

export function MeAgendaView({
  trackedBids,
  calendarEvents,
  onOpenBidWorkspace,
  onCreateReminder,
  onUpdateReminder,
  onDeleteReminder,
}: MeAgendaViewProps) {
  const now = new Date();

  // Se não houver eventos no mês atual, mas houver em meses futuros, inicializa no mês do próximo evento
  const smartInitial = useMemo(() => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
    const hasCurrentMonthEvents = calendarEvents.some((ev) =>
      ev.dateKey.startsWith(curMonthKey),
    );

    if (hasCurrentMonthEvents || calendarEvents.length === 0) {
      return { year: curYear, month: curMonth };
    }

    const nowMs = now.getTime();
    const parsed = calendarEvents
      .map((ev) => ({
        ev,
        date: parseAnyDate(ev.dueAt) || parseAnyDate(ev.dateKey) || now,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const nextUpcoming = parsed.find((p) => p.date.getTime() >= nowMs - 86400000);
    const target = nextUpcoming ? nextUpcoming.date : parsed[0]?.date || now;
    return { year: target.getFullYear(), month: target.getMonth() };
  }, [calendarEvents]);

  const [viewYear, setViewYear] = useState(smartInitial.year);
  const [viewMonth, setViewMonth] = useState(smartInitial.month);
  const [viewMode, setViewMode] = useState<AgendaViewMode>("calendar");
  const [filterType, setFilterType] = useState<AgendaFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de novo lembrete
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => now.toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState("09:00");
  const [newType, setNewType] = useState<AgendaEventType>("lembrete");
  const [newDesc, setNewDesc] = useState("");
  const [newBidId, setNewBidId] = useState("");

  // Detalhe rápido de lembrete clicado
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(
    null,
  );

  const counts = useMemo(() => {
    let abertura = 0;
    let sessao = 0;
    let lembrete = 0;
    for (const ev of calendarEvents) {
      if (ev.type === "abertura") abertura += 1;
      else if (ev.type === "sessao") sessao += 1;
      else lembrete += 1;
    }
    return {
      all: calendarEvents.length,
      abertura,
      sessao,
      lembrete,
    };
  }, [calendarEvents]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calendarEvents.filter((ev) => {
      if (filterType === "abertura" && ev.type !== "abertura") return false;
      if (filterType === "sessao" && ev.type !== "sessao") return false;
      if (
        filterType === "lembrete" &&
        ev.type !== "lembrete" &&
        ev.type !== "prazo"
      ) {
        return false;
      }
      if (q) {
        const hay = `${ev.title} ${ev.subtitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [calendarEvents, filterType, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.dateKey) ?? [];
      list.push(ev);
      map.set(ev.dateKey, list);
    }
    return map;
  }, [filteredEvents]);

  // Contagem de eventos no mês visível
  const currentMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const eventsInCurrentViewMonth = useMemo(() => {
    return filteredEvents.filter((ev) => ev.dateKey.startsWith(currentMonthKey));
  }, [currentMonthKey, filteredEvents]);

  // Próximo evento a partir de agora
  const nextUpcoming = useMemo(() => {
    const nowMs = Date.now();
    const sorted = [...calendarEvents]
      .map((ev) => ({
        ev,
        date: parseAnyDate(ev.dueAt) || parseAnyDate(ev.dateKey) || now,
      }))
      .filter((item) => item.date.getTime() >= nowMs - 86400000)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return sorted[0] ?? null;
  }, [calendarEvents]);

  // Próximos 4 compromissos para a régua rápida
  const upcomingSlice = useMemo(() => {
    const nowMs = Date.now();
    return [...calendarEvents]
      .map((ev) => ({
        ev,
        date: parseAnyDate(ev.dueAt) || parseAnyDate(ev.dateKey) || now,
      }))
      .filter((item) => item.date.getTime() >= nowMs - 86400000 && !item.ev.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [calendarEvents]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      dateKey: string;
      inMonth: boolean;
    }> = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      cells.push({
        day: d.getDate(),
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({
        day,
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const offset = cells.length - (startWeekday + daysInMonth) + 1;
      const d = new Date(viewYear, viewMonth + 1, offset);
      cells.push({
        day: d.getDate(),
        dateKey: toLocalDateKey(d) ?? "",
        inMonth: false,
      });
    }

    return cells;
  }, [viewMonth, viewYear]);

  const todayKey = toLocalDateKey(now);

  const navigateMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  const jumpToDate = (targetDate: Date) => {
    setViewYear(targetDate.getFullYear());
    setViewMonth(targetDate.getMonth());
    setViewMode("calendar");
  };

  const openCreateOnDate = (dateKey: string) => {
    setNewDate(dateKey);
    setNewTitle("");
    setNewDesc("");
    setNewBidId("");
    setNewType("lembrete");
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    const dueIso = new Date(`${newDate}T${newTime || "09:00"}:00`).toISOString();
    await onCreateReminder({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      dueAt: dueIso,
      type: newType,
      trackedBidId: newBidId || null,
    });
    setShowCreateModal(false);
    toast.success("Compromisso salvo na Agenda!");
  };

  const handleEventClick = (ev: CalendarEventItem) => {
    if (ev.reminderId) {
      setSelectedEvent(ev);
      return;
    }
    if (ev.bidControlId) {
      onOpenBidWorkspace(ev.bidControlId);
    }
  };

  return (
    <div className="agenda-page">
      {/* Cabeçalho */}
      <header className="agenda-page__header">
        <div>
          <h1>Agenda de Licitações</h1>
          <p>
            Acompanhe aberturas de editais, sessões públicas, prazos de
            impugnação e lembretes da sua empresa.
          </p>
        </div>

        <button
          type="button"
          className="ws-btn is-primary"
          onClick={() => openCreateOnDate(todayKey ?? now.toISOString().slice(0, 10))}
        >
          <Plus size={16} />
          <span>Criar lembrete</span>
        </button>
      </header>

      {/* Controles: Busca, Filtros por Tipo e Toggle de Modo */}
      <div className="agenda-controls">
        <div className="agenda-controls__left">
          <label className="ws-search-input">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, edital ou órgão…"
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

          <div className="agenda-pills">
            <button
              type="button"
              className={`agenda-pill ${filterType === "all" ? "is-active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              <span>Todos</span>
              <em>{counts.all}</em>
            </button>

            <button
              type="button"
              className={`agenda-pill ${filterType === "abertura" ? "is-active" : ""}`}
              onClick={() => setFilterType("abertura")}
            >
              <span>Abertura</span>
              {counts.abertura > 0 && <em>{counts.abertura}</em>}
            </button>

            <button
              type="button"
              className={`agenda-pill ${filterType === "sessao" ? "is-active" : ""}`}
              onClick={() => setFilterType("sessao")}
            >
              <span>Sessão pública</span>
              {counts.sessao > 0 && <em>{counts.sessao}</em>}
            </button>

            <button
              type="button"
              className={`agenda-pill ${filterType === "lembrete" ? "is-active" : ""}`}
              onClick={() => setFilterType("lembrete")}
            >
              <span>Prazos & Lembretes</span>
              {counts.lembrete > 0 && <em>{counts.lembrete}</em>}
            </button>
          </div>
        </div>

        {/* Alternador de visualização: Calendário vs Lista */}
        <div className="agenda-mode-toggle">
          <button
            type="button"
            className={`agenda-mode-btn ${viewMode === "calendar" ? "is-active" : ""}`}
            onClick={() => setViewMode("calendar")}
            title="Visualização em Calendário Mensal"
          >
            <CalendarIcon size={14} />
            <span>Mês</span>
          </button>
          <button
            type="button"
            className={`agenda-mode-btn ${viewMode === "list" ? "is-active" : ""}`}
            onClick={() => setViewMode("list")}
            title="Visualização em Lista de Prazos"
          >
            <List size={14} />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Aviso quando o mês exibido estiver vazio, mas houver evento em outro mês */}
      {viewMode === "calendar" &&
        eventsInCurrentViewMonth.length === 0 &&
        nextUpcoming &&
        (nextUpcoming.date.getMonth() !== viewMonth ||
          nextUpcoming.date.getFullYear() !== viewYear) && (
          <div className="agenda-empty-banner">
            <div className="agenda-empty-banner__content">
              <CalendarDays size={18} />
              <span>
                Nenhum evento em{" "}
                <strong>
                  {MONTHS_PT[viewMonth]} de {viewYear}
                </strong>
                . Seu próximo compromisso é{" "}
                <strong>{nextUpcoming.ev.title}</strong> em{" "}
                <strong>
                  {nextUpcoming.date.toLocaleDateString("pt-BR")} às{" "}
                  {nextUpcoming.ev.timeLabel}
                </strong>
                .
              </span>
            </div>
            <button
              type="button"
              className="agenda-empty-banner__btn"
              onClick={() => jumpToDate(nextUpcoming.date)}
            >
              <span>Ver em {MONTHS_PT[nextUpcoming.date.getMonth()]}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      {/* Caso Geral: Não há nenhum evento cadastrado na empresa */}
      {calendarEvents.length === 0 ? (
        <div className="agenda-empty-state">
          <div className="agenda-empty-state__icon">
            <CalendarDays size={26} />
          </div>
          <h3>Sua agenda está livre</h3>
          <p>
            As licitações que você salvar ou gerenciar no Radar aparecerão aqui
            com suas datas de abertura e prazos de impugnação. Você também pode
            registrar seus próprios lembretes.
          </p>
          <div className="agenda-empty-state__actions">
            <button
              type="button"
              className="ws-btn is-primary"
              onClick={() => openCreateOnDate(todayKey ?? now.toISOString().slice(0, 10))}
            >
              <Plus size={15} />
              <span>Criar lembrete</span>
            </button>
          </div>
        </div>
      ) : viewMode === "calendar" ? (
        /* MODO 1: CALENDÁRIO MENSAL */
        <>
          <section className="agenda-calendar-card">
            <div className="agenda-calendar-card__top">
              <div className="agenda-month-nav">
                <h2>
                  <strong>{MONTHS_PT[viewMonth]}</strong> {viewYear}
                </h2>
                <div className="agenda-month-nav__btns">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
                <button
                  type="button"
                  className="agenda-today-btn"
                  onClick={goToday}
                >
                  Hoje
                </button>
              </div>

              <div className="agenda-legend">
                <span>
                  <i className="dot-open" /> Abertura
                </span>
                <span>
                  <i className="dot-session" /> Sessão pública
                </span>
                <span>
                  <i className="dot-prazo" /> Prazo do edital
                </span>
                <span>
                  <i className="dot-rem" /> Lembrete
                </span>
              </div>
            </div>

            <div className="agenda-grid-weekdays">
              {WEEKDAYS_PT.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div className="agenda-grid-days">
              {calendarCells.map((cell, index) => {
                const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
                const isToday = cell.dateKey === todayKey;

                return (
                  <div
                    key={`${cell.dateKey}-${index}`}
                    className={`agenda-day-cell ${!cell.inMonth ? "is-outside" : ""} ${isToday ? "is-today" : ""}`}
                  >
                    <div className="agenda-day-cell__head">
                      <span className="agenda-day-num">{cell.day}</span>
                      <button
                        type="button"
                        className="agenda-day-add"
                        onClick={() => openCreateOnDate(cell.dateKey)}
                        title="Adicionar lembrete neste dia"
                        aria-label={`Adicionar lembrete em ${cell.day}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="agenda-day-cell__events">
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          className={`agenda-event-chip type-${ev.type} ${ev.completed ? "is-done" : ""}`}
                          onClick={() => handleEventClick(ev)}
                          title={`${ev.timeLabel} — ${ev.title} (${ev.subtitle})`}
                        >
                          <span className="agenda-event-chip__line1">
                            <time>{ev.timeLabel}</time>{" "}
                            <strong>{ev.title}</strong>
                          </span>
                          <small>{ev.subtitle}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Régua de Próximos Compromissos abaixo do calendário */}
          {upcomingSlice.length > 0 && (
            <div className="agenda-upcoming-section">
              <div className="agenda-upcoming-section__head">
                <h3>Próximos compromissos</h3>
                <button
                  type="button"
                  className="ws-btn is-ghost is-sm"
                  onClick={() => setViewMode("list")}
                >
                  <span>Ver todos em lista</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="agenda-upcoming-grid">
                {upcomingSlice.map(({ ev, date }) => {
                  const day = date.getDate();
                  const monthName = MONTHS_SHORT_PT[date.getMonth()];
                  const countdown = formatRelativeDue(ev.dueAt);

                  return (
                    <div
                      key={`mini-${ev.id}`}
                      className="agenda-mini-event-card"
                      onClick={() => handleEventClick(ev)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="agenda-mini-event-card__date">
                        {day} {monthName}
                      </div>
                      <div className="agenda-mini-event-card__info">
                        <strong>{ev.title}</strong>
                        <small>{ev.subtitle}</small>
                        {countdown.label && (
                          <span
                            className={`agenda-countdown-badge ${countdown.isUrgent ? "is-urgent" : ""}`}
                            style={{ alignSelf: "flex-start", marginTop: 4 }}
                          >
                            {countdown.label} às {ev.timeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* MODO 2: LISTA CRONOLÓGICA DE COMPROMISSOS */
        <div className="agenda-list-view">
          {filteredEvents.map((ev) => {
            const evDate = parseAnyDate(ev.dueAt) || parseAnyDate(ev.dateKey) || now;
            const day = String(evDate.getDate()).padStart(2, "0");
            const month = MONTHS_SHORT_PT[evDate.getMonth()];
            const year = evDate.getFullYear();
            const countdown = formatRelativeDue(ev.dueAt);

            const typeLabel =
              ev.type === "abertura"
                ? "Abertura de proposta"
                : ev.type === "sessao"
                  ? "Sessão pública"
                  : ev.type === "prazo"
                    ? "Prazo de edital"
                    : "Lembrete interno";

            return (
              <div key={`list-${ev.id}`} className="agenda-list-card">
                <div className="agenda-list-card__date-box">
                  <span className="agenda-list-card__day">{day}</span>
                  <span className="agenda-list-card__month">
                    {month} {year}
                  </span>
                  <span className="agenda-list-card__time">
                    <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    {ev.timeLabel}
                  </span>
                </div>

                <div className="agenda-list-card__body">
                  <div className="agenda-list-card__meta">
                    <span className={`agenda-type-badge type-${ev.type}`}>
                      {typeLabel}
                    </span>
                    {countdown.label && (
                      <span
                        className={`agenda-countdown-badge ${countdown.isUrgent ? "is-urgent" : ""}`}
                      >
                        {countdown.label}
                      </span>
                    )}
                    {ev.completed && (
                      <span className="agenda-type-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                        Concluído
                      </span>
                    )}
                  </div>

                  <h4 className="agenda-list-card__title">{ev.title}</h4>
                  <p className="agenda-list-card__subtitle">{ev.subtitle}</p>
                </div>

                <div className="agenda-list-card__actions">
                  {ev.bidControlId ? (
                    <button
                      type="button"
                      className="ws-btn is-primary is-sm"
                      onClick={() => onOpenBidWorkspace(ev.bidControlId!)}
                    >
                      <ExternalLink size={14} />
                      <span>Gerenciar licitação</span>
                    </button>
                  ) : ev.reminderId ? (
                    <button
                      type="button"
                      className="ws-btn is-ghost is-sm"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <span>Ver detalhes</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar Lembrete */}
      {showCreateModal && (
        <div
          className="ws-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <form className="agenda-modal" onSubmit={handleCreateSubmit}>
            <div className="ws-select-modal__header">
              <div>
                <h2>Criar lembrete na Agenda</h2>
                <p>Registre prazos internos, cotações ou compromissos.</p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="agenda-modal__body">
              <div className="ws-field">
                <label>Título do compromisso</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Renovar CND Estadual ou confirmar frete"
                  required
                  autoFocus
                />
              </div>

              <div className="agenda-modal__row">
                <div className="ws-field">
                  <label>Data</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="ws-field">
                  <label>Horário</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="ws-field">
                <label>Tipo de compromisso</label>
                <select
                  className="ws-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AgendaEventType)}
                >
                  <option value="lembrete">Lembrete geral</option>
                  <option value="prazo">Prazo interno / impugnação</option>
                  <option value="sessao">Sessão de lances / disputa</option>
                  <option value="abertura">Abertura de proposta</option>
                </select>
              </div>

              {trackedBids.length > 0 && (
                <div className="ws-field">
                  <label>Vincular a uma licitação (opcional)</label>
                  <select
                    className="ws-select"
                    value={newBidId}
                    onChange={(e) => setNewBidId(e.target.value)}
                  >
                    <option value="">Sem vínculo específico</option>
                    {trackedBids.map((tb) => (
                      <option key={tb.id} value={tb.id}>
                        {tb.nickname ||
                          `${tb.bidSnapshot.modality || "Licitação"} ${tb.bidSnapshot.purchaseNumber || tb.bidControlId}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ws-field">
                <label>Observações (opcional)</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detalhes adicionais sobre esta tarefa…"
                />
              </div>
            </div>

            <div className="ws-select-modal__footer">
              <span />
              <div className="ws-select-modal__actions">
                <button
                  type="button"
                  className="ws-btn is-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="ws-btn is-primary">
                  Salvar lembrete
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal rápido: Detalhes de lembrete clicado */}
      {selectedEvent && selectedEvent.reminderId && (
        <div
          className="ws-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null);
          }}
        >
          <div className="agenda-modal">
            <div className="ws-select-modal__header">
              <div>
                <h2>{selectedEvent.title}</h2>
                <p>
                  {selectedEvent.dateKey.split("-").reverse().join("/")} às{" "}
                  {selectedEvent.timeLabel}
                </p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={() => setSelectedEvent(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="agenda-modal__body">
              <p style={{ margin: 0, color: "#334155", fontSize: "0.9rem" }}>
                {selectedEvent.subtitle}
              </p>

              {selectedEvent.bidControlId && (
                <button
                  type="button"
                  className="ws-btn is-ghost is-sm"
                  onClick={() => {
                    const id = selectedEvent.bidControlId!;
                    setSelectedEvent(null);
                    onOpenBidWorkspace(id);
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Abrir gerenciamento da licitação</span>
                </button>
              )}
            </div>

            <div className="ws-select-modal__footer">
              <button
                type="button"
                className="ws-remove-link"
                onClick={async () => {
                  await onDeleteReminder(selectedEvent.reminderId!);
                  setSelectedEvent(null);
                  toast.info("Lembrete excluído");
                }}
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>

              <div className="ws-select-modal__actions">
                <button
                  type="button"
                  className="ws-btn is-primary"
                  onClick={async () => {
                    await onUpdateReminder(selectedEvent.reminderId!, {
                      completed: !selectedEvent.completed,
                    });
                    setSelectedEvent(null);
                  }}
                >
                  <Check size={15} />
                  <span>
                    {selectedEvent.completed
                      ? "Reabrir tarefa"
                      : "Marcar como concluído"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
