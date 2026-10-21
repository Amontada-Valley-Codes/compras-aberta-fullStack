"use client";

import { useMemo, useState } from "react";
import { Check, Database, FileCheck2, LayoutDashboard, Settings, Store, Users, X } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { AdminOverview } from "./AdminOverview";
import { AdminUsers } from "./AdminUsers";
import { PageHeading } from "./MeDashboard";
import { initials, readMessage, useAccessRequests } from "./useAccessRequests";
import { toast } from "@/components/ui/sonner";
import { formatCnpj, formatDateTime, formatPhone } from "@/lib/format-br";
import { accessStatusLabel, type AccessRequest, type AccessStatus } from "@/services/access-requests/access-requests.types";

const statusTabs: { id: AccessStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: accessStatusLabel.PENDING },
  { id: "APPROVED", label: accessStatusLabel.APPROVED },
  { id: "REJECTED", label: accessStatusLabel.REJECTED },
];

const statusClass: Record<AccessStatus, string> = {
  PENDING: "",
  APPROVED: "status-aprovada",
  REJECTED: "status-recusada",
};

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const state = useAccessRequests();
  const pendingCount = state.requests.filter((request) => request.status === "PENDING").length;
  const items: NavItem[] = [
    { id: "overview", label: "Visao geral", icon: <LayoutDashboard size={19} /> },
    { id: "requests", label: "Solicitacoes", icon: <FileCheck2 size={19} />, badge: pendingCount ? String(pendingCount) : undefined },
    { id: "companies", label: "Microempresas", icon: <Store size={19} /> },
    { id: "users", label: "Usuarios e acessos", icon: <Users size={19} /> },
    { id: "settings", label: "Configuracoes", icon: <Settings size={19} /> },
  ];
  const navigate = (id: string) => { setOpenRequestId(null); setActive(id); };
  const openRequest = (id: string) => { setOpenRequestId(id); setActive("requests"); };

  return (
    <AppShell role="admin" active={active} onNavigate={navigate} items={items}>
      <div key={active} className="ov-tab">
        {active === "overview" && <AdminOverview onNavigate={navigate} onOpenRequest={openRequest} state={state} />}
        {active === "requests" && <Requests state={state} initialSelectedId={openRequestId} />}
        {active === "companies" && <Requests state={state} approvedOnly />}
        {active === "users" && <AdminUsers />}
        {active === "settings" && <Placeholder title="Configuracoes" />}
      </div>
    </AppShell>
  );
}

function Requests({
  state,
  initialSelectedId = null,
  approvedOnly = false,
}: {
  state: ReturnType<typeof useAccessRequests>;
  initialSelectedId?: string | null;
  approvedOnly?: boolean;
}) {
  const { requests, loading, error, reload, replace } = state;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessStatus | "ALL">(approvedOnly ? "APPROVED" : "PENDING");
  const [selected, setSelected] = useState<AccessRequest | null>(() => requests.find((request) => request.id === initialSelectedId) ?? null);
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    const digits = search.replace(/\D/g, "");
    return requests.filter((request) => {
      const matchesStatus = approvedOnly ? request.status === "APPROVED" : filter === "ALL" || request.status === filter;
      const searchable = `${request.companyName} ${request.municipio.nome ?? ""} ${request.requester.name} ${request.requester.email}`.toLowerCase();
      return matchesStatus && (searchable.includes(search) || (digits.length > 0 && request.cnpj.includes(digits)));
    });
  }, [requests, query, filter, approvedOnly]);

  const decide = async (decision: "approve" | "reject") => {
    if (!selected) return;
    if (decision === "reject" && note.trim().length < 5) {
      toast.error("Informe o motivo da recusa", { description: "Esse motivo será enviado por e-mail para o solicitante." });
      return;
    }
    setDeciding(decision);
    try {
      const response = await fetch(`/api/admin/access-requests/${encodeURIComponent(selected.id)}/${decision}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!response.ok) {
        toast.error("Nao foi possivel registrar a decisao", { description: await readMessage(response, "Tente novamente.") });
        if (response.status === 409) void reload();
        return;
      }
      replace(await response.json());
      setSelected(null);
      toast.success(decision === "approve" ? "Acesso aprovado" : "Solicitação recusada", {
        description:
          decision === "approve"
            ? `${selected.companyName} já pode acessar a plataforma. Notificação enviada para ${selected.requester.email}.`
            : `Notificação com o motivo da recusa enviada para ${selected.requester.email}.`,
      });
    } catch {
      toast.error("Nao foi possivel registrar a decisao", { description: "Verifique sua conexao e tente novamente." });
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeading eyebrow={approvedOnly ? "GESTAO DA BASE" : "ANALISE CADASTRAL"} title={approvedOnly ? "Microempresas cadastradas" : "Solicitacoes de acesso"} description={approvedOnly ? "Empresas com acesso aprovado a plataforma." : "Confira os dados das microempresas e libere ou recuse o acesso."} />
      {!approvedOnly && <section className="request-tabs">{statusTabs.map((tab) => <button className={filter === tab.id ? "active" : ""} onClick={() => setFilter(tab.id)} key={tab.id}>{tab.label} <em>{tab.id === "ALL" ? requests.length : requests.filter((request) => request.status === tab.id).length}</em></button>)}</section>}
      <section className="dashboard-card filter-bar"><label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, CNPJ, municipio ou responsavel" /></label><span className="filter-context">Dados sensiveis protegidos</span></section>
      <section className="dashboard-card admin-table-card full-table">
        <div className="table-summary"><p><b>{visible.length}</b> solicitacoes nesta visualizacao</p><button onClick={() => void reload()} disabled={loading}>Atualizar lista</button></div>
        <div className="table-scroll"><table className="admin-table">
          <thead><tr><th>Empresa</th><th>Municipio</th><th>Enviada em</th><th>Responsavel</th><th>Situacao</th><th /></tr></thead>
          <tbody>
            {loading ? <tr><td className="table-state" colSpan={6}>Carregando solicitacoes...</td></tr>
              : error ? <tr><td className="table-state" colSpan={6} role="alert">{error} <button onClick={() => void reload()}>Tentar novamente</button></td></tr>
                : visible.length === 0 ? <tr><td className="table-state" colSpan={6}>Nenhuma solicitacao encontrada.</td></tr>
                  : visible.map((request) => <tr key={request.id}>
                    <td><span className="company-cell"><i>{initials(request.companyName)}</i><span><b>{request.companyName}</b><small>{formatCnpj(request.cnpj)}</small></span></span></td>
                    <td>{request.municipio.nome ?? "-"}</td><td>{formatDateTime(request.createdAt)}</td>
                    <td>{request.requester.name}<small>{request.requester.email}</small></td>
                    <td><em className={`table-status ${statusClass[request.status]}`}>{accessStatusLabel[request.status]}</em></td>
                    <td><button className="table-action" onClick={() => { setSelected(request); setNote(""); }}>{request.status === "PENDING" ? "Analisar" : "Ver"}</button></td>
                  </tr>)}
          </tbody>
        </table></div>
      </section>
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <section className="review-drawer" onClick={(event) => event.stopPropagation()}>
          <header><div><small>ANALISE DE SOLICITACAO</small><h2>{selected.companyName}</h2><p>{formatCnpj(selected.cnpj)} - {selected.municipio.nome ?? "Municipio nao informado"}</p></div><button onClick={() => setSelected(null)} aria-label="Fechar"><X /></button></header>
          <div className="review-section"><h3>Dados da empresa</h3><dl>
            <div><dt>Municipio</dt><dd>{selected.municipio.nome ?? "-"}</dd></div><div><dt>Recebida em</dt><dd>{formatDateTime(selected.createdAt)}</dd></div>
            <div><dt>Responsavel</dt><dd>{selected.requester.name}</dd></div><div><dt>Telefone</dt><dd>{formatPhone(selected.phone)}</dd></div><div><dt>E-mail</dt><dd>{selected.requester.email}</dd></div>
          </dl>{selected.message && <p className="review-message">"{selected.message}"</p>}</div>
          {selected.docsUrls && (
            <div className="review-section">
              <h3>Documentos comprobatórios anexados</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                {selected.docsUrls.cartao_cnpj && (
                  <a
                    href={selected.docsUrls.cartao_cnpj}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-button secondary"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "0.85rem", padding: "8px 12px" }}
                  >
                    📄 Cartão CNPJ
                  </a>
                )}
                {selected.docsUrls.contrato_social && (
                  <a
                    href={selected.docsUrls.contrato_social}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-button secondary"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "0.85rem", padding: "8px 12px" }}
                  >
                    📄 Contrato Social
                  </a>
                )}
                {selected.docsUrls.comprovante_endereco && (
                  <a
                    href={selected.docsUrls.comprovante_endereco}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-button secondary"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "0.85rem", padding: "8px 12px" }}
                  >
                    📄 Comprovante Endereço
                  </a>
                )}
                {selected.docsUrls.comprovante_socio && (
                  <a
                    href={selected.docsUrls.comprovante_socio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-button secondary"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "0.85rem", padding: "8px 12px" }}
                  >
                    📄 Comprovante Sócio
                  </a>
                )}
              </div>
            </div>
          )}
          {selected.status === "PENDING" ? <><label className="review-note">Observacao da decisao (obrigatoria para recusar)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} /></label><footer>
            <button className="ds-button secondary" disabled={deciding !== null} onClick={() => void decide("reject")}>{deciding === "reject" ? "Salvando..." : "Recusar"}</button>
            <button className="ds-button primary" disabled={deciding !== null} onClick={() => void decide("approve")}>{deciding === "approve" ? "Salvando..." : <><Check /> Aprovar acesso</>}</button>
          </footer></> : <div className="review-section"><h3>Decisao</h3><p>{accessStatusLabel[selected.status]}{selected.reviewedBy ? ` por ${selected.reviewedBy}` : ""}</p>{selected.reviewNote && <p className="review-message">{selected.reviewNote}</p>}</div>}
        </section>
      </div>}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="dashboard-page"><PageHeading eyebrow="ADMINISTRACAO DA PLATAFORMA" title={title} description="Esta area sera disponibilizada em uma proxima etapa." /></div>;
}
