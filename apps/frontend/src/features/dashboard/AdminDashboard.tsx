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
  FileCheck2,
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
import { AdminOverview } from "./AdminOverview";
import { CardHeader, Metric, PageHeading } from "./MeDashboard";
import { initials, readMessage, useAccessRequests, type RequestsState } from "./useAccessRequests";
import { toast } from "@/components/ui/sonner";
import { formatCnpj, formatDateTime, formatPhone } from "@/lib/format-br";
import {
  accessStatusLabel,
  type AccessRequest,
  type AccessStatus,
} from "@/services/access-requests/access-requests.types";

const statusClass: Record<AccessStatus, string> = {
  PENDING: "",
  APPROVED: "status-aprovada",
  REJECTED: "status-recusada",
};

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  // Solicitação a abrir direto na aba "Solicitações" (ex.: "Analisar" na
  // visão geral). Navegar pelo menu limpa a escolha.
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const navigate = (id: string) => {
    setOpenRequestId(null);
    setActive(id);
  };
  const openRequest = (id: string) => {
    setOpenRequestId(id);
    setActive("requests");
  };
  const accessRequests = useAccessRequests();
  const pendingCount = accessRequests.requests.filter(
    (item) => item.status === "PENDING",
  ).length;

  const navItems: NavItem[] = [
    { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
    {
      id: "requests",
      label: "Solicitações",
      icon: <FileCheck2 size={19} />,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    { id: "companies", label: "Microempresas", icon: <Store size={19} /> },
    { id: "municipalities", label: "Municípios", icon: <Building2 size={19} /> },
    { id: "integrations", label: "Integrações", icon: <Database size={19} /> },
    { id: "users", label: "Usuários e acessos", icon: <Users size={19} /> },
    { id: "settings", label: "Configurações", icon: <Settings size={19} /> },
  ];

  return (
    <AppShell
      role="admin"
      active={active}
      onNavigate={navigate}
      items={navItems}
    >
      {/* key: cada troca de aba remonta o conteúdo e repete a entrada suave. */}
      <div key={active} className="ov-tab">
        {active === "overview" && (
          <AdminOverview
            onNavigate={navigate}
            onOpenRequest={openRequest}
            state={accessRequests}
          />
        )}
        {active === "requests" && (
          <Requests state={accessRequests} initialSelectedId={openRequestId} />
        )}
        {active === "companies" && (
          <Companies requests={accessRequests.requests} />
        )}
        {active === "integrations" && <Integrations />}
        {active === "municipalities" && <SimpleRegistry type="municipalities" />}
        {active === "users" && <SimpleRegistry type="users" />}
        {active === "settings" && <SettingsPage />}
      </div>
    </AppShell>
  );
}

const statusTabs: { id: AccessStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: accessStatusLabel.PENDING },
  { id: "APPROVED", label: accessStatusLabel.APPROVED },
  { id: "REJECTED", label: accessStatusLabel.REJECTED },
];

function Requests({
  state,
  initialSelectedId = null,
}: {
  state: RequestsState;
  initialSelectedId?: string | null;
}) {
  const { requests, loading, error, reload, replace } = state;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessStatus | "ALL">("PENDING");
  // A aba remonta a cada navegação, então o valor inicial basta para abrir a
  // ficha pedida pela visão geral.
  const [selected, setSelected] = useState<AccessRequest | null>(
    () => state.requests.find((item) => item.id === initialSelectedId) ?? null,
  );
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    const digits = search.replace(/\D/g, "");
    return requests.filter(
      (item) =>
        (filter === "ALL" || item.status === filter) &&
        (`${item.companyName} ${item.municipio.nome ?? ""} ${item.requester.name} ${item.requester.email}`
          .toLowerCase()
          .includes(search) ||
          (digits.length > 0 && item.cnpj.includes(digits))),
    );
  }, [requests, query, filter]);

  const open = (item: AccessRequest) => {
    setSelected(item);
    setNote("");
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!selected) return;
    if (decision === "reject" && note.trim().length < 5) {
      toast.error("Informe o motivo da recusa", {
        description: "A empresa verá esse motivo na tela de status.",
      });
      return;
    }

    setDeciding(decision);
    try {
      const response = await fetch(
        `/api/admin/access-requests/${encodeURIComponent(selected.id)}/${decision}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() || undefined }),
        },
      );
      if (!response.ok) {
        toast.error("Não foi possível registrar a decisão", {
          description: await readMessage(response, "Tente novamente."),
        });
        // 409: outro administrador já decidiu; recarrega para mostrar o estado atual.
        if (response.status === 409) void reload();
        return;
      }

      replace(await response.json());
      setSelected(null);
      toast.success(
        decision === "approve" ? "Acesso aprovado" : "Solicitação recusada",
        {
          description:
            decision === "approve"
              ? `${selected.companyName} já pode usar a área da empresa.`
              : `${selected.companyName} verá o motivo na tela de status.`,
        },
      );
    } catch {
      toast.error("Não foi possível registrar a decisão", {
        description: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ANÁLISE CADASTRAL"
        title="Solicitações de acesso"
        description="Confira os dados das microempresas e libere ou recuse o acesso à plataforma."
      />
      <section className="request-tabs">
        {statusTabs.map((tab) => (
          <button
            className={filter === tab.id ? "active" : ""}
            onClick={() => setFilter(tab.id)}
            key={tab.id}
          >
            {tab.label}{" "}
            <em>
              {tab.id === "ALL"
                ? requests.length
                : requests.filter((item) => item.status === tab.id).length}
            </em>
          </button>
        ))}
      </section>
      <section className="dashboard-card filter-bar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar empresa, CNPJ, município ou responsável"
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
          <button onClick={() => void reload()} disabled={loading}>
            Atualizar lista
          </button>
        </div>
        <RequestTable
          items={visible}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma solicitação encontrada."
          onOpen={open}
        />
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
                <h2>{selected.companyName}</h2>
                <p>
                  {formatCnpj(selected.cnpj)} • {selected.municipio.nome}/CE
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fechar">
                <X />
              </button>
            </header>
            <div className="review-section">
              <h3>Dados da empresa</h3>
              <dl>
                <div>
                  <dt>Razão social</dt>
                  <dd>{selected.companyName}</dd>
                </div>
                <div>
                  <dt>CNPJ</dt>
                  <dd>{formatCnpj(selected.cnpj)}</dd>
                </div>
                <div>
                  <dt>Município</dt>
                  <dd>{selected.municipio.nome ?? "—"}</dd>
                </div>
                <div>
                  <dt>Recebida em</dt>
                  <dd>{formatDateTime(selected.createdAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="review-section">
              <h3>Responsável pelo acesso</h3>
              <dl>
                <div>
                  <dt>Nome</dt>
                  <dd>{selected.requester.name}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{formatPhone(selected.phone)}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{selected.requester.email}</dd>
                </div>
              </dl>
              {selected.message && (
                <p className="review-message">“{selected.message}”</p>
              )}
            </div>
            {selected.status === "PENDING" ? (
              <>
                <label className="review-note">
                  Observação da decisão (obrigatória para recusar)
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                    placeholder="Na recusa, explique o motivo: a empresa verá este texto."
                  />
                </label>
                <footer>
                  <button
                    className="ds-button secondary"
                    onClick={() => void decide("reject")}
                    disabled={deciding !== null}
                  >
                    {deciding === "reject" ? (
                      <Loader2 className="spin" />
                    ) : (
                      <X />
                    )}{" "}
                    Recusar
                  </button>
                  <button
                    className="ds-button primary"
                    onClick={() => void decide("approve")}
                    disabled={deciding !== null}
                  >
                    {deciding === "approve" ? (
                      <Loader2 className="spin" />
                    ) : (
                      <Check />
                    )}{" "}
                    Aprovar acesso
                  </button>
                </footer>
              </>
            ) : (
              <div className="review-section">
                <h3>Decisão</h3>
                <dl>
                  <div>
                    <dt>Situação</dt>
                    <dd>{accessStatusLabel[selected.status]}</dd>
                  </div>
                  <div>
                    <dt>Decidida em</dt>
                    <dd>
                      {selected.reviewedAt
                        ? formatDateTime(selected.reviewedAt)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Por</dt>
                    <dd>{selected.reviewedBy ?? "—"}</dd>
                  </div>
                </dl>
                {selected.reviewNote && (
                  <p className="review-message">{selected.reviewNote}</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RequestTable({
  items,
  loading = false,
  error = null,
  emptyMessage = "Nenhum registro.",
  onOpen,
}: {
  items: AccessRequest[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onOpen: (item: AccessRequest) => void;
}) {
  const stateMessage = loading
    ? "Carregando solicitações…"
    : error ?? (items.length === 0 ? emptyMessage : null);

  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Município</th>
            <th>Enviada em</th>
            <th>Responsável</th>
            <th>Situação</th>
            <th>
              <span className="sr-only">Ação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {stateMessage ? (
            <tr>
              <td colSpan={6} className="table-state" role="status">
                {stateMessage}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="company-cell">
                    <i>{initials(item.companyName)}</i>
                    <span>
                      <b>{item.companyName}</b>
                      <small>{formatCnpj(item.cnpj)}</small>
                    </span>
                  </span>
                </td>
                <td>{item.municipio.nome ?? "—"}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td>
                  {item.requester.name}
                  <small>{item.requester.email}</small>
                </td>
                <td>
                  <em className={`table-status ${statusClass[item.status]}`}>
                    {accessStatusLabel[item.status]}
                  </em>
                </td>
                <td>
                  <button className="table-action" onClick={() => onOpen(item)}>
                    {item.status === "PENDING" ? "Analisar" : "Ver"}{" "}
                    <ArrowRight />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Companies({ requests }: { requests: AccessRequest[] }) {
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
          title="Empresas aprovadas"
          subtitle="Microempresas com acesso liberado à plataforma"
        />
        <RequestTable
          items={requests.filter((item) => item.status === "APPROVED")}
          emptyMessage="Nenhuma empresa aprovada ainda."
          onOpen={() => undefined}
        />
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
