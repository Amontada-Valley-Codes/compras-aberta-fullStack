"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Database,
  FileCheck2,
  Inbox,
  RefreshCw,
  Store,
  X,
} from "lucide-react";
import { AdminFlowChart, RegistrationDonut, Sparkline } from "./AdminCharts";
import { initials, type RequestsState } from "./useAccessRequests";
import { CountUp } from "./CountUp";
import { formatCnpj } from "@/lib/format-br";
import type { AccessRequest } from "@/services/access-requests/access-requests.types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Séries demonstrativas dos indicadores que ainda não vêm do backend.
// Constantes de módulo: o Sparkline memoiza pela referência do array.
const COMPANIES_TREND = [298, 312, 325, 341, 356, 370, 384];
const MUNICIPALITIES_TREND = [33, 35, 36, 38, 39, 41, 42];
const HEALTH_TREND = [97.2, 98.1, 96.8, 98.9, 99.1, 98.4, 98.7];

// Sinal de cada fonte nas últimas 24 verificações (1 = ok, 0 = falha).
const SOURCES = [
  { name: "PNCP", records: "1.842 registros", ok: true, beats: "111111111111111111111111" },
  { name: "TCE Ceará", records: "921 registros", ok: true, beats: "111111111101111111111111" },
  { name: "Portais municipais", records: "2 indisponíveis", ok: false, beats: "111110111111101111100111" },
];

const enter = (index: number) => ({ "--i": index }) as CSSProperties;

function relativeTime(date: string, now: number) {
  const diff = new Date(date).getTime() - now;
  const format = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

// "Agora" atualizado a cada minuto (e só no cliente, depois da montagem).
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Kpi({
  index,
  onClick,
  actionLabel,
  icon,
  label,
  value,
  decimals = 0,
  suffix = "",
  detail,
  trend,
  tone = "blue",
  children,
}: {
  index: number;
  onClick: () => void;
  actionLabel: string;
  icon: ReactNode;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  detail: ReactNode;
  trend?: string;
  tone?: "blue" | "gold" | "teal" | "green";
  children?: ReactNode;
}) {
  return (
    // O card inteiro é um botão que leva à área correspondente: a seta no
    // canto deixa claro que dá para clicar.
    <button
      type="button"
      className={`ov-card ov-kpi is-${tone} ov-enter`}
      style={enter(index + 1)}
      onClick={onClick}
      aria-label={`${label}: ${actionLabel}`}
    >
      <div className="ov-kpi-top">
        <span className="ov-kpi-icon">{icon}</span>
        {trend && <em className="ov-kpi-trend">{trend}</em>}
        <ArrowUpRight className="ov-kpi-go" aria-hidden="true" />
      </div>
      <small>{label}</small>
      <b>
        <CountUp value={value} decimals={decimals} suffix={suffix} delay={250 + index * 110} />
      </b>
      <p>{detail}</p>
      {children}
    </button>
  );
}

function CardHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="ov-card-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function PendingQueue({
  state,
  now,
  onOpenRequest,
}: {
  state: RequestsState;
  now: number | null;
  onOpenRequest: (id: string) => void;
}) {
  const pending = state.requests
    .filter((item) => item.status === "PENDING")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);

  if (state.loading) {
    return (
      <ul className="ov-queue" aria-busy="true">
        {[0, 1, 2].map((item) => (
          <li key={item} className="ov-skeleton" />
        ))}
      </ul>
    );
  }

  if (state.error) {
    return (
      <div className="ov-empty is-error" role="status">
        <AlertCircle />
        <p>{state.error}</p>
        <button type="button" onClick={() => void state.reload()}>
          <RefreshCw /> Tentar de novo
        </button>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="ov-empty is-done" role="status">
        <CheckCircle2 />
        <p>
          <b>Tudo em dia.</b> Nenhuma solicitação aguardando análise.
        </p>
      </div>
    );
  }

  return (
    <ul className="ov-queue">
      {pending.map((item, index) => {
        const waitingDays = now ? Math.floor((now - new Date(item.createdAt).getTime()) / DAY_MS) : 0;
        return (
          <li key={item.id} style={{ "--row": index } as CSSProperties}>
            <span className="ov-avatar">{initials(item.companyName)}</span>
            <div className="ov-queue-company">
              <b>{item.companyName}</b>
              <small>
                {formatCnpj(item.cnpj)} • {item.municipio.nome ?? "—"}
              </small>
            </div>
            <span className={`ov-wait ${waitingDays >= 2 ? "is-late" : ""}`}>
              {now ? relativeTime(item.createdAt, now) : "—"}
            </span>
            <button type="button" onClick={() => onOpenRequest(item.id)}>
              Analisar <ArrowRight />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type ActivityEvent = {
  id: string;
  at: string;
  kind: "received" | "approved" | "rejected";
  request: AccessRequest;
};

// Linha do tempo real, montada a partir das solicitações: envios e decisões.
function buildActivity(requests: AccessRequest[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const request of requests) {
    events.push({ id: `${request.id}-in`, at: request.createdAt, kind: "received", request });
    if (request.reviewedAt && request.status !== "PENDING") {
      events.push({
        id: `${request.id}-out`,
        at: request.reviewedAt,
        kind: request.status === "APPROVED" ? "approved" : "rejected",
        request,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
}

const activityCopy = {
  received: { icon: <Inbox />, text: "enviou uma solicitação de acesso" },
  approved: { icon: <Check />, text: "teve o acesso aprovado" },
  rejected: { icon: <X />, text: "teve a solicitação recusada" },
};

function ActivityTimeline({ state, now }: { state: RequestsState; now: number | null }) {
  const events = buildActivity(state.requests);

  if (state.loading) {
    return (
      <ul className="ov-timeline" aria-busy="true">
        {[0, 1, 2].map((item) => (
          <li key={item} className="ov-skeleton is-small" />
        ))}
      </ul>
    );
  }

  if (events.length === 0) {
    return (
      <div className="ov-empty" role="status">
        <CalendarDays />
        <p>As solicitações e decisões aparecem aqui.</p>
      </div>
    );
  }

  return (
    <ol className="ov-timeline">
      {events.map((event, index) => (
        <li key={event.id} className={`is-${event.kind}`} style={{ "--row": index } as CSSProperties}>
          <span className="ov-timeline-icon">{activityCopy[event.kind].icon}</span>
          <div>
            <b>{event.request.companyName}</b> {activityCopy[event.kind].text}
            <small>
              {now ? relativeTime(event.at, now) : "—"}
              {event.kind !== "received" && event.request.reviewedBy
                ? ` • por ${event.request.reviewedBy}`
                : ""}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

type Alert = {
  id: string;
  tone: "warning" | "danger";
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
};

// Tudo o que pede ação, num lugar só: fila atrasada, fontes com problema e
// falha ao carregar os dados.
function AlertsPanel({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  if (loading) {
    return (
      <ul className="ov-alerts" aria-busy="true">
        {[0, 1].map((item) => (
          <li key={item} className="ov-skeleton is-small" />
        ))}
      </ul>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="ov-empty is-done" role="status">
        <CheckCircle2 />
        <p>
          <b>Nenhum alerta.</b> Fila e fontes de dados funcionando normalmente.
        </p>
      </div>
    );
  }

  return (
    <ul className="ov-alerts">
      {alerts.map((alert, index) => (
        <li key={alert.id} className={`is-${alert.tone}`} style={{ "--row": index } as CSSProperties}>
          <span className="ov-alert-icon">
            <AlertTriangle />
          </span>
          <div>
            <b>{alert.title}</b>
            <small>{alert.detail}</small>
          </div>
          <button type="button" onClick={alert.onAction}>
            {alert.action} <ArrowRight />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ index, title, hint }: { index: number; title: string; hint: string }) {
  return (
    <div className="ov-section-title ov-enter" style={enter(index)}>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}

export function AdminOverview({
  onNavigate,
  onOpenRequest,
  state,
}: {
  onNavigate: (id: string) => void;
  onOpenRequest: (id: string) => void;
  state: RequestsState;
}) {
  const now = useNow();
  const pending = state.requests.filter((item) => item.status === "PENDING");
  const decided = state.requests.length - pending.length;
  const oldestPending = pending.reduce<AccessRequest | null>(
    (oldest, item) => (!oldest || item.createdAt < oldest.createdAt ? item : oldest),
    null,
  );
  const latePending = now
    ? pending.filter((item) => now - new Date(item.createdAt).getTime() >= 2 * DAY_MS)
    : [];
  const today = now
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now)
    : null;

  const alerts: Alert[] = [];
  if (state.error) {
    alerts.push({
      id: "load-error",
      tone: "danger",
      title: "Solicitações indisponíveis",
      detail: state.error,
      action: "Tentar de novo",
      onAction: () => void state.reload(),
    });
  }
  if (latePending.length > 0) {
    alerts.push({
      id: "late",
      tone: "warning",
      title:
        latePending.length === 1
          ? "1 solicitação espera há mais de 2 dias"
          : `${latePending.length} solicitações esperam há mais de 2 dias`,
      detail: "Empresas aguardando a liberação do acesso.",
      action: "Analisar",
      onAction: () => onOpenRequest(latePending[0].id),
    });
  }
  for (const source of SOURCES.filter((item) => !item.ok)) {
    alerts.push({
      id: `source-${source.name}`,
      tone: "warning",
      title: `${source.name} com instabilidade`,
      detail: source.records,
      action: "Ver integrações",
      onAction: () => onNavigate("integrations"),
    });
  }

  // Resumo do dia em linguagem simples, logo abaixo do título.
  const summary = state.loading
    ? "Carregando o resumo de hoje…"
    : state.error
      ? "Não foi possível carregar as solicitações. Veja os alertas abaixo."
      : [
        pending.length === 0
          ? "Nenhuma solicitação aguardando análise"
          : pending.length === 1
            ? "Você tem 1 solicitação aguardando análise"
            : `Você tem ${pending.length} solicitações aguardando análise`,
        alerts.length === 0
          ? "nenhum alerta."
          : alerts.length === 1
            ? "1 alerta para ver."
            : `${alerts.length} alertas para ver.`,
      ].join(" e ");

  return (
    <div className="ov-page">
      <header className="ov-heading ov-enter" style={enter(0)}>
        <div>
          <span className="ov-eyebrow">
            <i aria-hidden="true" /> ADMINISTRAÇÃO DA PLATAFORMA
          </span>
          <h1>Visão geral</h1>
          <p className="ov-summary" aria-live="polite">
            {summary}
          </p>
        </div>
        <div className="ov-heading-actions">
          {today && (
            <span className="ov-date">
              <CalendarDays /> {today}
            </span>
          )}
          <button
            className="ov-primary"
            type="button"
            onClick={() => (oldestPending ? onOpenRequest(oldestPending.id) : onNavigate("requests"))}
          >
            {oldestPending ? "Analisar a mais antiga" : "Ver solicitações"} <ArrowRight />
          </button>
        </div>
      </header>

      <SectionTitle index={1} title="Precisa da sua atenção" hint="Comece por aqui: o que está esperando uma decisão." />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-8 ov-enter" style={enter(2)}>
          <CardHead
            title="Fila de solicitações"
            subtitle="As mais antigas primeiro. Clique em Analisar para abrir a ficha."
            action={
              <button className="ov-link" type="button" onClick={() => onNavigate("requests")}>
                Ver todas <ArrowRight />
              </button>
            }
          />
          <PendingQueue state={state} now={now} onOpenRequest={onOpenRequest} />
        </article>
        <article className="ov-card ov-span-4 ov-enter" style={enter(3)}>
          <CardHead title="Alertas" subtitle="Problemas que pedem uma ação" />
          <AlertsPanel alerts={alerts} loading={state.loading} />
        </article>
      </section>

      <SectionTitle index={4} title="Indicadores" hint="Clique em um card para ver os detalhes." />
      <section className="ov-kpis ov-section" aria-label="Indicadores">
        <Kpi
          index={4}
          tone="gold"
          onClick={() => onNavigate("requests")}
          actionLabel="ver solicitações"
          icon={<FileCheck2 />}
          label="Solicitações pendentes"
          value={state.loading ? 0 : pending.length}
          detail={
            oldestPending && now
              ? `A mais antiga chegou ${relativeTime(oldestPending.createdAt, now)}`
              : state.loading
                ? "Carregando a fila…"
                : "Nenhuma aguardando decisão"
          }
        >
          <div className="ov-kpi-meter" aria-hidden="true">
            <span
              style={{
                width: `${state.requests.length ? (decided / state.requests.length) * 100 : 0}%`,
              }}
            />
          </div>
          <small className="ov-kpi-caption">
            {decided} de {state.requests.length} solicitações decididas
          </small>
        </Kpi>
        <Kpi
          index={5}
          onClick={() => onNavigate("companies")}
          actionLabel="ver microempresas"
          icon={<Store />}
          label="Microempresas cadastradas"
          value={384}
          detail="42 aguardam aprovação"
          trend="+14%"
        >
          <Sparkline data={COMPANIES_TREND} color="#2563A6" />
        </Kpi>
        <Kpi
          index={6}
          tone="teal"
          onClick={() => onNavigate("municipalities")}
          actionLabel="ver municípios"
          icon={<Building2 />}
          label="Municípios integrados"
          value={42}
          detail="39 sincronizados hoje"
          trend="+3"
        >
          <Sparkline data={MUNICIPALITIES_TREND} color="#18A3BC" />
        </Kpi>
        <Kpi
          index={7}
          tone="green"
          onClick={() => onNavigate("integrations")}
          actionLabel="ver integrações"
          icon={<Database />}
          label="Saúde das integrações"
          value={98.7}
          decimals={1}
          suffix="%"
          detail="1 fonte requer atenção"
        >
          <Sparkline data={HEALTH_TREND} color="#2D8B6F" />
        </Kpi>
      </section>

      <SectionTitle index={8} title="Desempenho dos cadastros" hint="Passe o mouse nos gráficos para ver os detalhes." />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-8 ov-enter" style={enter(9)}>
          <CardHead
            title="Fluxo de cadastros"
            subtitle="Quantas solicitações chegaram, quantas foram aprovadas e a taxa de aprovação"
          />
          <AdminFlowChart />
        </article>
        <article className="ov-card ov-span-4 ov-enter" style={enter(10)}>
          <CardHead title="Situação cadastral" subtitle="Como está a base de microempresas hoje" />
          <RegistrationDonut />
        </article>
      </section>

      <SectionTitle index={11} title="Acompanhamento" hint="O que aconteceu recentemente na plataforma." />
      <section className="ov-grid ov-section">
        <article className="ov-card ov-span-6 ov-enter" style={enter(12)}>
          <CardHead title="Atividade recente" subtitle="Envios e decisões da equipe" />
          <ActivityTimeline state={state} now={now} />
        </article>
        <article className="ov-card ov-span-6 ov-enter" style={enter(13)}>
          <CardHead
            title="Saúde das fontes"
            subtitle="Últimas 24 verificações de cada fonte de dados"
            action={
              <button className="ov-link" type="button" onClick={() => onNavigate("integrations")}>
                Integrações <ArrowRight />
              </button>
            }
          />
          <div className="ov-sources">
            {SOURCES.map((source) => (
              <div key={source.name} className={`ov-source ${source.ok ? "" : "is-warning"}`}>
                <div className="ov-source-head">
                  <i aria-hidden="true" />
                  <b>{source.name}</b>
                  <em>{source.ok ? "Operacional" : "Atenção"}</em>
                </div>
                <small>{source.records}</small>
                <div className="ov-beats" aria-hidden="true">
                  {source.beats.split("").map((beat, index) => (
                    <span
                      key={index}
                      className={beat === "1" ? "" : "is-down"}
                      style={{ "--b": index } as CSSProperties}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
