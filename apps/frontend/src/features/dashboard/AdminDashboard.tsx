"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FileCheck2,
  FileText,
  LayoutDashboard,
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
import { companyRequests, type CompanyRequest } from "@/lib/mock-data";
import { CardHeader, Metric, PageHeading } from "./MeDashboard";

const navItems: NavItem[] = [
  { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
  {
    id: "requests",
    label: "Solicitações",
    icon: <FileCheck2 size={19} />,
    badge: "8",
  },
  { id: "companies", label: "Microempresas", icon: <Store size={19} /> },
  { id: "municipalities", label: "Municípios", icon: <Building2 size={19} /> },
  { id: "integrations", label: "Integrações", icon: <Database size={19} /> },
  { id: "users", label: "Usuários e acessos", icon: <Users size={19} /> },
  { id: "settings", label: "Configurações", icon: <Settings size={19} /> },
];

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const [requests, setRequests] = useState(companyRequests);
  return (
    <AppShell
      role="admin"
      active={active}
      onNavigate={setActive}
      items={navItems}
    >
      {active === "overview" && (
        <AdminOverview onNavigate={setActive} requests={requests} />
      )}
      {active === "requests" && (
        <Requests requests={requests} setRequests={setRequests} />
      )}
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
          <b>8 solicitações aguardam análise</b>
          <p>3 delas estão na fila há mais de 48 horas.</p>
        </div>
        <button onClick={() => onNavigate("requests")}>
          Priorizar agora <ArrowRight />
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
          value={String(pending.length + 5)}
          detail="3 com mais de 48 horas"
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
}: {
  requests: CompanyRequest[];
  setRequests: (items: CompanyRequest[]) => void;
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
  const decide = (status: CompanyRequest["status"]) => {
    if (!selected) return;
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
  };
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ANÁLISE CADASTRAL"
        title="Solicitações de microempresas"
        description="Priorize a fila, confira documentos e registre decisões com rastreabilidade."
      />
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
      </section>
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
              <h3>Documentos enviados</h3>
              {[
                "Cartão CNPJ",
                "Contrato social",
                "Comprovante de endereço",
                "Identificação do responsável",
              ].map((doc, index) => (
                <button className="review-doc" key={doc}>
                  <FileText />
                  <span>
                    <b>{doc}</b>
                    <small>PDF • {index + 2}40 KB</small>
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
