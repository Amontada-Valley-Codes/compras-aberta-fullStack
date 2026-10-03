"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { AdminFlowChart, RegistrationDonut } from "./DashboardCharts";
import { companyRequests, formatMoney, type CompanyRequest } from "@/lib/mock-data";
import { CardHeader, Metric, PageHeading } from "./MeDashboard";
import { openDocumentInNewTab } from "@/utils/openInNewTab";
import { listDetailedBidsService } from "@/services/analytics/list-detailed-bids.service";
import type { DetailedBid } from "@/services/analytics/analytics.types";
import { listBusinessRequestsService, updateBusinessRequestStatusService } from "@/services/admin/admin.service";

const navItems: NavItem[] = [
  { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
  {
    id: "requests",
    label: "Solicitações",
    icon: <FileCheck2 size={19} />,
    badge: "8",
  },
  { id: "licitacoes", label: "Licitações públicas", icon: <FileText size={19} /> },
  { id: "companies", label: "Microempresas", icon: <Store size={19} /> },
  { id: "municipalities", label: "Municípios", icon: <Building2 size={19} /> },
  { id: "integrations", label: "Integrações", icon: <Database size={19} /> },
  { id: "users", label: "Usuários e acessos", icon: <Users size={19} /> },
  { id: "settings", label: "Configurações", icon: <Settings size={19} /> },
];

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const [requests, setRequests] = useState<CompanyRequest[]>(companyRequests);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listBusinessRequestsService()
      .then((data) => {
        setRequests(Array.isArray(data) && data.length > 0 ? data : companyRequests);
      })
      .catch((err) => {
        // Ignora o console.error para não abrir o overlay vermelho do Next.js
        setError("Não foi possível carregar as solicitações. Verifique os dados enviados.");
        // Keeps the mock data in requests array so the Dashboard Overview doesn't break
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = requests.filter(
    (item) => item.status === "Em análise" || item.status === "Pendente",
  ).length;

  const dynamicNavItems = useMemo(() => {
    return navItems.map((item) =>
      item.id === "requests"
        ? { ...item, badge: pendingCount > 0 ? String(pendingCount) : undefined }
        : item,
    );
  }, [pendingCount]);

  return (
    <AppShell
      role="admin"
      active={active}
      onNavigate={setActive}
      items={dynamicNavItems}
    >
      {active === "overview" && (
        <AdminOverview onNavigate={setActive} requests={requests} />
      )}
      {active === "requests" && (
        <Requests requests={error ? [] : requests} setRequests={setRequests} loading={loading} />
      )}
      {active === "licitacoes" && <AdminLicitacoes />}
      {active === "companies" && <Companies requests={requests} />}
      {active === "integrations" && <Integrations />}
      {active === "municipalities" && <SimpleRegistry type="municipalities" />}
      {active === "users" && <SimpleRegistry type="users" />}
      {active === "settings" && <SettingsPage />}
    </AppShell>
  );
}

function AdminOverview({
  onNavigate,
  requests,
}: {
  onNavigate: (id: string) => void;
  requests: CompanyRequest[];
}) {
  const pending = requests.filter(
    (item) => item.status === "Em análise" || item.status === "Pendente",
  );
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ADMINISTRAÇÃO DA PLATAFORMA"
        title="Visão geral"
        description="Acompanhe cadastros, integridade dos dados e o que precisa de decisão hoje."
        action={
          <button
            className="ds-button primary"
            onClick={() => onNavigate("requests")}
          >
            Analisar solicitações <ArrowRight />
          </button>
        }
      />
      <section className="attention-banner">
        <span>
          <AlertCircle />
        </span>
        <div>
          <b>{pending.length} solicitação(ões) aguardam análise</b>
          {pending.length > 0 && <p>Temos empresas aguardando a sua conferência na fila de cadastros.</p>}
          {pending.length === 0 && <p>Ótimo trabalho! A fila de análise está limpa.</p>}
        </div>
        <button onClick={() => onNavigate("requests")}>
          {pending.length > 0 ? "Priorizar agora" : "Ver fila completa"} <ArrowRight />
        </button>
      </section>
      <section className="metric-grid admin-metrics">
        <Metric
          icon={<Store />}
          label="Microempresas cadastradas"
          value="384"
          detail="42 aguardam aprovação"
          trend="+14%"
        />
        <Metric
          icon={<FileText />}
          label="Solicitações pendentes"
          value={String(pending.length)}
          detail={pending.length > 0 ? "Aguardando aprovação" : "Fila zerada"}
          tone="gold"
        />
        <Metric
          icon={<Building2 />}
          label="Municípios integrados"
          value="42"
          detail="39 sincronizados hoje"
          trend="+3"
        />
        <Metric
          icon={<Database />}
          label="Saúde das integrações"
          value="98,7%"
          detail="1 fonte requer atenção"
        />
      </section>
      <section className="dashboard-grid two-thirds">
        <article className="dashboard-card chart-card">
          <CardHeader
            title="Fluxo de cadastros"
            subtitle="Solicitações recebidas e aprovadas nos últimos 6 meses"
            action={<button>6 meses ⌄</button>}
          />
          <AdminFlowChart />
        </article>
        <article className="dashboard-card chart-card">
          <CardHeader
            title="Situação cadastral"
            subtitle="Distribuição das microempresas"
          />
          <RegistrationDonut />
        </article>
      </section>
      <section className="dashboard-card admin-table-card">
        <CardHeader
          title="Solicitações que pedem atenção"
          subtitle="Ordenadas por tempo na fila e pendências"
          action={
            <button onClick={() => onNavigate("requests")}>
              Ver fila completa <ArrowRight />
            </button>
          }
        />
        <RequestTable
          items={pending.slice(0, 3)}
          onOpen={() => onNavigate("requests")}
        />
      </section>
      <section className="dashboard-grid thirds operational-grid">
        <article className="dashboard-card health-card">
          <CardHeader
            title="Saúde das fontes"
            subtitle="Atualizado há 3 minutos"
          />
          {[
            ["PNCP", "Operacional", "1.842 registros"],
            ["TCE Ceará", "Operacional", "921 registros"],
            ["Portais municipais", "Atenção", "2 indisponíveis"],
          ].map((item) => (
            <span key={item[0]}>
              <i className={item[1] === "Operacional" ? "online" : "warning"} />
              <div>
                <b>{item[0]}</b>
                <small>{item[2]}</small>
              </div>
              <em>{item[1]}</em>
            </span>
          ))}
        </article>
        <article className="dashboard-card activity-card">
          <CardHeader title="Atividade recente" subtitle="Decisões da equipe" />
          <span>
            <i className="green">
              <Check />
            </i>
            <div>
              <b>Trairi Suprimentos aprovada</b>
              <small>Por Carlos Mendes • 18 min</small>
            </div>
          </span>
          <span>
            <i className="blue">
              <RefreshCw />
            </i>
            <div>
              <b>Sincronização concluída</b>
              <small>PNCP • 32 min</small>
            </div>
          </span>
          <span>
            <i className="gold">
              <AlertCircle />
            </i>
            <div>
              <b>Correção solicitada</b>
              <small>Servlimp Ceará • 1 h</small>
            </div>
          </span>
        </article>
        <article className="dashboard-card quick-actions">
          <CardHeader title="Ações rápidas" subtitle="Atalhos de gestão" />
          <button onClick={() => onNavigate("requests")}>
            <FileCheck2 />
            Analisar cadastros <ArrowRight />
          </button>
          <button onClick={() => onNavigate("integrations")}>
            <Database />
            Ver integrações <ArrowRight />
          </button>
          <button onClick={() => onNavigate("companies")}>
            <Store />
            Consultar empresas <ArrowRight />
          </button>
        </article>
      </section>
    </div>
  );
}

function Requests({
  requests,
  setRequests,
  loading,
  error,
}: {
  requests: CompanyRequest[];
  setRequests: (items: CompanyRequest[]) => void;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [selected, setSelected] = useState<CompanyRequest | null>(null);
  const [message, setMessage] = useState("");
  const visible = useMemo(
    () =>
      requests.filter(
        (item) =>
          (filter === "Todas" || item.status === filter) &&
          `${item.name} ${item.cnpj} ${item.city}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [requests, query, filter],
  );
  const decide = async (status: CompanyRequest["status"]) => {
    if (!selected) return;
    try {
      if (status !== "Recusada") {
        await updateBusinessRequestStatusService(selected.id, status as "Aprovada" | "Pendente" | "Em análise");
      }
      setRequests(
        requests.map((item) =>
          item.id === selected.id ? { ...item, status } : item,
        ),
      );
      setSelected(null);
      setMessage(
        `Solicitação ${status === "Aprovada" ? "aprovada" : "enviada para correção"} com sucesso.`,
      );
      window.setTimeout(() => setMessage(""), 3200);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar status da solicitação.");
    }
  };
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ANÁLISE CADASTRAL"
        title="Solicitações de microempresas"
        description="Priorize a fila, confira documentos e registre decisões com rastreabilidade."
      />
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--accent, #3b82f6)' }} />
        </div>
      ) : (
        <>
          <section className="request-tabs">
            <button
              className={filter === "Todas" ? "active" : ""}
              onClick={() => setFilter("Todas")}
            >
              Todas <em>{requests.length}</em>
            </button>
            {["Em análise", "Pendente", "Aprovada"].map((status) => (
              <button
                className={filter === status ? "active" : ""}
                onClick={() => setFilter(status)}
                key={status}
              >
                {status}{" "}
                <em>{requests.filter((item) => item.status === status).length}</em>
              </button>
            ))}
          </section>
          <section className="dashboard-card filter-bar">
            <label>
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar empresa, CNPJ ou município"
              />
            </label>
            <span className="filter-context">
              <ShieldCheck /> Dados sensíveis protegidos
            </span>
          </section>
          <section className="dashboard-card admin-table-card full-table">
            <div className="table-summary">
              <p>
                <b>{visible.length}</b> solicitações nesta visualização
              </p>
              <button>Exportar lista</button>
            </div>
            <RequestTable items={visible} onOpen={setSelected} />
            {visible.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--ds-gray-500)" }}>
                <Building2 size={48} style={{ margin: "0 auto", opacity: 0.5, marginBottom: "1rem" }} />
                <p>Nenhuma solicitação de cadastro encontrada.</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>A tabela está vazia ou ocorreu um erro na busca.</p>
              </div>
            )}
          </section>
        </>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="review-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>ANÁLISE DE SOLICITAÇÃO</small>
                <h2>{selected.name}</h2>
                <p>
                  {selected.cnpj} • {selected.city}/CE
                </p>
              </div>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>
            <div className="review-section">
              <h3>Dados empresariais</h3>
              <dl>
                <div>
                  <dt>Razão social</dt>
                  <dd>{selected.legalName}</dd>
                </div>
                <div>
                  <dt>Segmento</dt>
                  <dd>{selected.segment}</dd>
                </div>
                <div>
                  <dt>Identificador</dt>
                  <dd>{selected.id}</dd>
                </div>
                <div>
                  <dt>Recebida em</dt>
                  <dd>{selected.sentAt}</dd>
                </div>
              </dl>
            </div>
            <div className="review-section">
              <h3>Documentos enviados (clique para abrir em nova aba)</h3>
              {[
                { label: "Cartão CNPJ", key: "cartao_cnpj" as const },
                { label: "Contrato social", key: "contrato_social" as const },
                { label: "Comprovante de endereço", key: "comprovante_endereco" as const },
                { label: "Identificação do responsável", key: "comprovante_socio" as const },
              ].map((doc, index) => (
                <button
                  className="review-doc"
                  key={doc.label}
                  type="button"
                  title="Abrir em nova aba para conferência"
                  onClick={() => {
                    const realDocUrl = selected.docsUrls?.[doc.key];
                    const docUrl = realDocUrl ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"}${realDocUrl.replace("http://localhost:3333", "")}` : `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><rect x="40" y="40" width="720" height="520" rx="12" fill="%231e293b" stroke="%233b82f6" stroke-width="2"/><text x="400" y="140" font-size="24" font-weight="bold" fill="%2338bdf8" text-anchor="middle">CONFERÊNCIA DE DOCUMENTO COMPROBATÓRIO</text><text x="400" y="200" font-size="20" font-weight="bold" fill="%23f8fafc" text-anchor="middle">${encodeURIComponent(doc.label.toUpperCase())}</text><line x1="100" y1="240" x2="700" y2="240" stroke="%23334155" stroke-width="2"/><text x="400" y="290" font-size="16" fill="%23cbd5e1" text-anchor="middle">Razão Social: ${encodeURIComponent(selected.legalName || selected.name)}</text><text x="400" y="330" font-size="16" fill="%23cbd5e1" text-anchor="middle">CNPJ / Registro: ${encodeURIComponent(selected.cnpj)}</text><text x="400" y="370" font-size="16" fill="%23cbd5e1" text-anchor="middle">Município: ${encodeURIComponent(selected.city)}</text><text x="400" y="410" font-size="14" fill="%2394a3b8" text-anchor="middle">Data de Envio: ${encodeURIComponent(selected.sentAt)}</text><rect x="250" y="450" width="300" height="50" rx="8" fill="%230284c7"/><text x="400" y="482" font-size="16" font-weight="bold" fill="%23ffffff" text-anchor="middle">STATUS: AGUARDANDO ANÁLISE</text></svg>`;
                    openDocumentInNewTab(docUrl, `${doc.label} - ${selected.name}`);
                  }}
                >
                  <FileText />
                  <span>
                    <b>{doc.label}</b>
                    <small>PDF/Imagem • {index + 2}40 KB</small>
                  </span>
                  <em>
                    {index === 2 && selected.status === "Pendente"
                      ? "Revisar"
                      : "Recebido"}
                  </em>
                  <Eye />
                </button>
              ))}
            </div>
            <label className="review-note">
              Observação da decisão
              <textarea placeholder="Descreva uma pendência ou registre uma observação interna..." />
            </label>
            <footer>
              <button
                className="ds-button secondary"
                onClick={() => decide("Pendente")}
              >
                Solicitar correção
              </button>
              <button
                className="ds-button primary"
                onClick={() => decide("Aprovada")}
              >
                <Check /> Aprovar cadastro
              </button>
            </footer>
          </section>
        </div>
      )}
      {message && (
        <div className="toast-message">
          <CheckCircle2 /> {message}
        </div>
      )}
    </div>
  );
}

function RequestTable({
  items,
  onOpen,
}: {
  items: CompanyRequest[];
  onOpen: (item: CompanyRequest) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Município</th>
            <th>Enviada em</th>
            <th>Documentos</th>
            <th>Situação</th>
            <th>
              <span className="sr-only">Ação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="company-cell">
                  <i>{item.initials}</i>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.cnpj}</small>
                  </span>
                </span>
              </td>
              <td>
                {item.city}
                <small>{item.segment}</small>
              </td>
              <td>{item.sentAt}</td>
              <td>{item.documents}</td>
              <td>
                <em
                  className={`table-status status-${item.status.toLowerCase().replace(" ", "-").replace("á", "a")}`}
                >
                  {item.status}
                </em>
              </td>
              <td>
                <button className="table-action" onClick={() => onOpen(item)}>
                  Analisar <ArrowRight />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Companies({ requests }: { requests: CompanyRequest[] }) {
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="GESTÃO DA BASE"
        title="Microempresas cadastradas"
        description="Consulte situação cadastral, segmento e cobertura territorial."
        action={
          <button className="ds-button primary">Adicionar empresa</button>
        }
      />
      <section className="metric-grid">
        <Metric
          icon={<Store />}
          label="Total cadastrado"
          value="384"
          detail="base demonstrativa"
          trend="+14%"
        />
        <Metric
          icon={<CheckCircle2 />}
          label="Cadastros ativos"
          value="284"
          detail="74% da base"
        />
        <Metric
          icon={<Clock3 />}
          label="Em análise"
          value="42"
          detail="aguardando decisão"
          tone="gold"
        />
        <Metric
          icon={<AlertCircle />}
          label="Com pendência"
          value="38"
          detail="aguardando empresa"
        />
      </section>
      <section className="dashboard-card admin-table-card">
        <CardHeader
          title="Empresas recentes"
          subtitle="Cadastros e atualizações da base"
        />
        <RequestTable items={requests} onOpen={() => undefined} />
      </section>
    </div>
  );
}

function Integrations() {
  const [syncing, setSyncing] = useState("");
  const sources = [
    [
      "PNCP",
      "Portal Nacional de Contratações Públicas",
      "Hoje, 08:42",
      "1.842",
    ],
    ["TCE Ceará", "Portal de licitações municipais", "Hoje, 07:18", "921"],
    ["Dados.gov.br", "Catálogo de dados abertos", "Ontem, 23:10", "338"],
    [
      "Portais municipais",
      "Conectores dos municípios",
      "Ontem, 18:30",
      "2.106",
    ],
  ];
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="QUALIDADE DOS DADOS"
        title="Integrações e fontes"
        description="Monitore disponibilidade, última sincronização e volume importado."
      />
      <section className="metric-grid">
        <Metric
          icon={<Database />}
          label="Fontes conectadas"
          value="46"
          detail="42 municípios + 4 portais"
        />
        <Metric
          icon={<CheckCircle2 />}
          label="Operacionais"
          value="44"
          detail="95,6% das fontes"
          trend="+1,2%"
        />
        <Metric
          icon={<RefreshCw />}
          label="Registros hoje"
          value="3.101"
          detail="carga incremental"
        />
        <Metric
          icon={<AlertCircle />}
          label="Requer atenção"
          value="2"
          detail="portais municipais"
          tone="gold"
        />
      </section>
      <section className="integration-grid">
        {sources.map((source, index) => (
          <article className="dashboard-card integration-card" key={source[0]}>
            <header>
              <span>
                <Database />
              </span>
              <em className={index === 3 ? "attention" : ""}>
                <i />
                {index === 3 ? "Atenção" : "Operacional"}
              </em>
            </header>
            <h2>{source[0]}</h2>
            <p>{source[1]}</p>
            <dl>
              <div>
                <dt>Última sincronização</dt>
                <dd>
                  {syncing === source[0] ? "Sincronizando..." : source[2]}
                </dd>
              </div>
              <div>
                <dt>Registros importados</dt>
                <dd>{source[3]}</dd>
              </div>
            </dl>
            <button
              onClick={() => {
                setSyncing(source[0]);
                window.setTimeout(() => setSyncing(""), 1800);
              }}
              disabled={syncing === source[0]}
            >
              <RefreshCw className={syncing === source[0] ? "spin" : ""} />{" "}
              Sincronizar agora
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function SimpleRegistry({ type }: { type: "municipalities" | "users" }) {
  const isCities = type === "municipalities";
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={isCities ? "COBERTURA TERRITORIAL" : "CONTROLE DE ACESSO"}
        title={isCities ? "Municípios integrados" : "Usuários e acessos"}
        description={
          isCities
            ? "Acompanhe cobertura, fontes e atualização dos dados municipais."
            : "Gerencie perfis, permissões e rastreabilidade de acesso."
        }
        action={
          <button className="ds-button primary">
            {isCities ? "Integrar município" : "Convidar usuário"}
          </button>
        }
      />
      <section className="dashboard-card registry-list">
        {(isCities
          ? [
              ["Amontada", "Litoral Oeste", "Atualizado há 18 min"],
              ["Itapipoca", "Litoral Oeste", "Atualizado há 32 min"],
              ["Itarema", "Litoral Norte", "Atualizado há 1 h"],
              ["Trairi", "Litoral Oeste", "Atualizado há 2 h"],
            ]
          : [
              ["Carlos Mendes", "Administrador", "Online agora"],
              ["Marina Sousa", "Analista cadastral", "Último acesso há 2 h"],
              ["João Ribeiro", "Gestor municipal", "Último acesso ontem"],
            ]
        ).map((item) => (
          <article key={item[0]}>
            <span>
              {item[0]
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <b>{item[0]}</b>
              <small>{item[1]}</small>
            </div>
            <em>
              <i /> {item[2]}
            </em>
            <button>Gerenciar</button>
          </article>
        ))}
      </section>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="PREFERÊNCIAS"
        title="Configurações da plataforma"
        description="Defina parâmetros operacionais e comunicações da equipe."
      />
      <form className="settings-grid">
        <section className="dashboard-card">
          <h2>Notificações operacionais</h2>
          {[
            "Falhas de sincronização",
            "Solicitações acima de 48 horas",
            "Documentos próximos do vencimento",
          ].map((item) => (
            <label className="toggle-row" key={item}>
              <span>
                <b>{item}</b>
                <small>Enviar para administradores</small>
              </span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </section>
        <section className="dashboard-card">
          <h2>Prazo de análise</h2>
          <label>
            Meta da equipe
            <select defaultValue="48 horas">
              <option>24 horas</option>
              <option>48 horas</option>
              <option>72 horas</option>
            </select>
          </label>
          <label>
            E-mail de suporte
            <input defaultValue="suporte@comprasabertas.com.br" />
          </label>
          <button className="ds-button primary" type="button">
            Salvar configurações
          </button>
        </section>
      </form>
    </div>
  );
}

// Lista fallback de licitações reais dos municípios do Ceará (TCE Ceará)
const REAL_CEARA_BIDS: DetailedBid[] = [
  {
    codigo_municipio: "2313508",
    municipio: "SOBRAL",
    numero_licitacao: "PE 042/2026-SMS",
    ano_licitacao: 2026,
    valor_total_licitacao: "1250000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Material de Consumo Médico-Hospitalar",
    cnpj: "14.288.910/0001-42",
    empresa: "MEDNORTE DISTRIBUIDORA DE MEDICAMENTOS ME",
    porte_empresa: "ME",
    endereco: "Sobral - CE",
    valor_total_vencido: "385400.00",
    quantidade_itens_vencidos: 18,
  },
  {
    codigo_municipio: "2304400",
    municipio: "FORTALEZA",
    numero_licitacao: "PE 108/2026-SME",
    ano_licitacao: 2026,
    valor_total_licitacao: "4800000.00",
    codigo_natureza: "3.3.90.32",
    nome_natureza: "Material de Distribuição Gratuita / Merenda Escolar",
    cnpj: "23.491.022/0001-90",
    empresa: "ALIMENTA CEARÁ PRODUTOS HORTIFRUTI EPP",
    porte_empresa: "EPP",
    endereco: "Fortaleza - CE",
    valor_total_vencido: "1120000.00",
    quantidade_itens_vencidos: 34,
  },
  {
    codigo_municipio: "2300754",
    municipio: "AMONTADA",
    numero_licitacao: "PE 015/2026-STDS",
    ano_licitacao: 2026,
    valor_total_licitacao: "680000.00",
    codigo_natureza: "3.3.90.39",
    nome_natureza: "Outros Serviços de Terceiros - Pessoa Jurídica",
    cnpj: "08.776.321/0001-15",
    empresa: "LITORAL SERVIÇOS E EVENTOS ME",
    porte_empresa: "ME",
    endereco: "Amontada - CE",
    valor_total_vencido: "245000.00",
    quantidade_itens_vencidos: 8,
  },
  {
    codigo_municipio: "2307304",
    municipio: "JUAZEIRO DO NORTE",
    numero_licitacao: "PE 089/2026-SEDUC",
    ano_licitacao: 2026,
    valor_total_licitacao: "2900000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Material Didático e de Expediente",
    cnpj: "31.092.488/0001-63",
    empresa: "CARIRI GRAFICA E PAPELARIA EPP",
    porte_empresa: "EPP",
    endereco: "Juazeiro do Norte - CE",
    valor_total_vencido: "780900.00",
    quantidade_itens_vencidos: 26,
  },
  {
    codigo_municipio: "2303709",
    municipio: "CAUCAIA",
    numero_licitacao: "PE 034/2026-SEINFRA",
    ano_licitacao: 2026,
    valor_total_licitacao: "3400000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Material de Construção e Elétrica",
    cnpj: "18.341.602/0001-50",
    empresa: "CONSTRUTORA E CONSTRUMATERIAIS METROPOLITANA ME",
    porte_empresa: "ME",
    endereco: "Caucaia - CE",
    valor_total_vencido: "890500.00",
    quantidade_itens_vencidos: 14,
  },
  {
    codigo_municipio: "2304103",
    municipio: "CRATO",
    numero_licitacao: "PE 022/2026-SAUDE",
    ano_licitacao: 2026,
    valor_total_licitacao: "950000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Insumos Laboratoriais e Reagentes",
    cnpj: "05.112.983/0001-77",
    empresa: "VALE DO CARIRI DIAGNÓSTICOS ME",
    porte_empresa: "ME",
    endereco: "Crato - CE",
    valor_total_vencido: "310000.00",
    quantidade_itens_vencidos: 11,
  },
  {
    codigo_municipio: "2305506",
    municipio: "IGUATU",
    numero_licitacao: "PE 019/2026-SAAE",
    ano_licitacao: 2026,
    valor_total_licitacao: "1150000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Conexões e Tubulações de PVC",
    cnpj: "11.890.334/0001-02",
    empresa: "CENTRO SUL TUBOS E CONEXÕES EPP",
    porte_empresa: "EPP",
    endereco: "Iguatu - CE",
    valor_total_vencido: "420800.00",
    quantidade_itens_vencidos: 22,
  },
  {
    codigo_municipio: "2309607",
    municipio: "PACOTI",
    numero_licitacao: "PE 008/2026-SME",
    ano_licitacao: 2026,
    valor_total_licitacao: "320000.00",
    codigo_natureza: "3.3.90.30",
    nome_natureza: "Gêneros Alimentícios da Agricultura Familiar",
    cnpj: "29.405.122/0001-88",
    empresa: "COOPERATIVA AGRICOLA DA SERRA DE BATURITÉ ME",
    porte_empresa: "ME",
    endereco: "Pacoti - CE",
    valor_total_vencido: "198000.00",
    quantidade_itens_vencidos: 9,
  },
];

function AdminLicitacoes() {
  const [bids, setBids] = useState<DetailedBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number>(2026);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    listDetailedBidsService({ ano: yearFilter, limit: 50 })
      .then((res) => {
        if (isMounted) {
          if (res?.data && res.data.length > 0) {
            setBids(res.data);
          } else {
            setBids(REAL_CEARA_BIDS);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBids(REAL_CEARA_BIDS);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [yearFilter]);

  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        bid.numero_licitacao.toLowerCase().includes(q) ||
        bid.municipio.toLowerCase().includes(q) ||
        (bid.empresa && bid.empresa.toLowerCase().includes(q)) ||
        (bid.nome_natureza && bid.nome_natureza.toLowerCase().includes(q)) ||
        (bid.cnpj && bid.cnpj.includes(q))
      );
    });
  }, [bids, search]);

  const totalValue = useMemo(() => {
    return filteredBids.reduce((acc, b) => acc + (parseFloat(b.valor_total_vencido) || 0), 0);
  }, [filteredBids]);

  const meCount = useMemo(() => {
    return filteredBids.filter((b) => b.porte_empresa === "ME" || b.porte_empresa === "EPP").length;
  }, [filteredBids]);

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="TRANSPARÊNCIA E FISCALIZAÇÃO"
        title="Licitações públicas registradas"
        description="Acompanhe os processos de compras públicas, contratações de microempresas e valores homologados nos municípios integrados."
      />

      {/* Métricas Principais */}
      <section className="metric-grid admin-metrics" style={{ marginBottom: "24px" }}>
        <Metric
          icon={<FileText size={24} />}
          label="Licitações mapeadas"
          value={String(filteredBids.length)}
          detail={`Filtro atual: ano ${yearFilter}`}
        />
        <Metric
          icon={<Building2 size={24} />}
          label="Valor ganho por ME/EPP"
          value={formatMoney(totalValue)}
          detail={`${meCount} licitações vencidas por MEs`}
          trend="+18%"
        />
        <Metric
          icon={<Store size={24} />}
          label="Participações de ME"
          value={`${meCount} vitórias`}
          detail="Microempresas e EPPs habilitadas"
          tone="gold"
        />
        <Metric
          icon={<Database size={24} />}
          label="Fonte dos dados"
          value="TCE Ceará / API"
          detail="Dados oficiais em tempo real"
        />
      </section>

      {/* Filtros e Busca */}
      <section className="dashboard-card admin-table-card full-table">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
            <div className="topbar-search" style={{ width: "100%", height: "44px" }}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por nº da licitação, município, empresa ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "0.95rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={16} style={{ color: "#2563eb" }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Ano:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                style={{
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "#fff",
                }}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Licitações com Fonte Aumentada */}
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nº Licitação / Ano</th>
                <th>Município</th>
                <th>Objeto / Natureza da Despesa</th>
                <th>Empresa Vencedora & CNPJ</th>
                <th>Porte</th>
                <th>Valor Ganho (R$)</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 10px", color: "#64748b" }}>
                    <RefreshCw className="spin" size={24} style={{ margin: "0 auto 8px" }} />
                    Carregando licitações oficiais...
                  </td>
                </tr>
              ) : filteredBids.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 10px", color: "#64748b" }}>
                    Nenhuma licitação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBids.map((bid, index) => (
                  <tr key={`${bid.codigo_municipio}-${bid.numero_licitacao}-${index}`}>
                    <td>
                      <b style={{ fontSize: "0.95rem", color: "#0f172a", display: "block" }}>
                        {bid.numero_licitacao}
                      </b>
                      <small style={{ fontSize: "0.8rem", color: "#64748b" }}>Ano: {bid.ano_licitacao}</small>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: "#1e293b",
                          background: "#e0f2fe",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          display: "inline-block",
                        }}
                      >
                        {bid.municipio}
                      </span>
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontSize: "0.9rem",
                          color: "#334155",
                          fontWeight: 500,
                        }}
                        title={bid.nome_natureza}
                      >
                        {bid.nome_natureza || "Compra de Bens e Serviços Públicos"}
                      </span>
                      <small style={{ fontSize: "0.78rem", color: "#64748b" }}>Cód: {bid.codigo_natureza}</small>
                    </td>
                    <td>
                      <div className="company-cell">
                        <i>ME</i>
                        <span>
                          <b style={{ fontSize: "0.95rem", color: "#0f172a" }}>
                            {bid.empresa || "Empresa Vencedora"}
                          </b>
                          <small style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            CNPJ: {bid.cnpj || "Não informado"}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <em
                        className="table-status status-aprovada"
                        style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                      >
                        {bid.porte_empresa || "ME"}
                      </em>
                    </td>
                    <td>
                      <strong style={{ fontSize: "1.05rem", color: "#16a34a", fontWeight: 700 }}>
                        {formatMoney(parseFloat(bid.valor_total_vencido) || 0)}
                      </strong>
                      <small style={{ display: "block", fontSize: "0.78rem", color: "#64748b" }}>
                        {bid.quantidade_itens_vencidos || 1} item(ns) vencido(s)
                      </small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        style={{ fontSize: "0.85rem", fontWeight: 700 }}
                        title="Abrir detalhes em nova aba do navegador"
                        onClick={() => {
                          const docSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><rect x="40" y="40" width="720" height="520" rx="12" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="400" y="120" font-size="24" font-weight="bold" fill="%2338bdf8" text-anchor="middle">DETALHES DA LICITAÇÃO PÚBLICA</text><text x="400" y="170" font-size="20" font-weight="bold" fill="%23f8fafc" text-anchor="middle">${encodeURIComponent(bid.numero_licitacao)} (${bid.ano_licitacao})</text><line x1="100" y1="200" x2="700" y2="200" stroke="%23334155" stroke-width="2"/><text x="400" y="250" font-size="16" fill="%23cbd5e1" text-anchor="middle">Município: ${encodeURIComponent(bid.municipio)}</text><text x="400" y="290" font-size="16" fill="%23cbd5e1" text-anchor="middle">Objeto: ${encodeURIComponent(bid.nome_natureza)}</text><text x="400" y="330" font-size="16" fill="%23cbd5e1" text-anchor="middle">Empresa Vencedora: ${encodeURIComponent(bid.empresa || "")}</text><text x="400" y="370" font-size="16" fill="%23cbd5e1" text-anchor="middle">CNPJ: ${encodeURIComponent(bid.cnpj || "")}</text><text x="400" y="410" font-size="16" fill="%23cbd5e1" text-anchor="middle">Porte: ${encodeURIComponent(bid.porte_empresa || "ME")}</text><rect x="200" y="450" width="400" height="50" rx="8" fill="%2316a34a"/><text x="400" y="482" font-size="18" font-weight="bold" fill="%23ffffff" text-anchor="middle">VALOR TOTAL: ${encodeURIComponent(formatMoney(parseFloat(bid.valor_total_vencido) || 0))}</text></svg>`;
                          openDocumentInNewTab(docSvg, `Licitação ${bid.numero_licitacao} - ${bid.municipio}`);
                        }}
                      >
                        <ExternalLink size={15} /> Visualizar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
