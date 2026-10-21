"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Shield, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { PageHeading } from "./MeDashboard";
import { initials } from "./useAccessRequests";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/format-br";
import { useUserProfile } from "@/hooks/useUserProfile";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export function AdminUsers() {
  const { profile: currentUser } = useUserProfile();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Erro ao carregar administradores.");
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Não foi possível carregar a lista de administradores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.message || "Não foi possível cadastrar o administrador.");
        return;
      }

      toast.success("Administrador cadastrado com sucesso!", {
        description: `${data.name} agora tem acesso total ao painel.`,
      });

      setName("");
      setEmail("");
      setPassword("");
      setShowAddModal(false);
      void loadUsers();
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userToDelete: AdminUser) => {
    setDeletingId(userToDelete.id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userToDelete.id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.message || "Não foi possível remover o administrador.");
        return;
      }

      toast.success("Administrador removido!", {
        description: `O acesso de ${userToDelete.name} foi revogado.`,
      });

      setConfirmDeleteUser(null);
      void loadUsers();
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <PageHeading
          eyebrow="CONTROLE DE ACESSO"
          title="Usuários e acessos"
          description="Gerencie apenas os administradores com permissão de acesso ao painel de controle."
        />
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="ds-button primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "12px" }}
        >
          <UserPlus size={18} /> Novo Administrador
        </button>
      </div>

      <section className="dashboard-card admin-table-card full-table" style={{ marginTop: "24px" }}>
        <div className="table-summary">
          <p>
            <b>{users.length}</b> {users.length === 1 ? "administrador cadastrado" : "administradores cadastrados"}
          </p>
          <button onClick={() => void loadUsers()} disabled={loading}>
            Atualizar lista
          </button>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Administrador</th>
                <th>E-mail</th>
                <th>Permissão</th>
                <th>Cadastrado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-state" colSpan={5}>
                    Carregando administradores...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan={5}>
                    Nenhum administrador encontrado.
                  </td>
                </tr>
              ) : (
                users.map((admin) => {
                  const isCurrent = currentUser?.id === admin.id || currentUser?.email === admin.email;
                  return (
                    <tr key={admin.id}>
                      <td>
                        <span className="company-cell">
                          <i>{initials(admin.name)}</i>
                          <span>
                            <b>{admin.name}</b>
                            {isCurrent && (
                              <small style={{ color: "#2563eb", fontWeight: 600 }}>● Você</small>
                            )}
                          </span>
                        </span>
                      </td>
                      <td>{admin.email}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: "#ecfdf5",
                            color: "#047857",
                          }}
                        >
                          <Shield size={14} /> Admin
                        </span>
                      </td>
                      <td>{formatDateTime(admin.createdAt)}</td>
                      <td>
                        {isCurrent ? (
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(admin)}
                            disabled={deletingId === admin.id}
                            style={{
                              background: "transparent",
                              border: "1px solid #fecaca",
                              color: "#dc2626",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                            }}
                          >
                            <Trash2 size={14} /> Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de cadastro de novo admin */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <section
            className="review-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%", padding: "28px" }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <small style={{ color: "#64748b", fontWeight: 600, letterSpacing: "0.05em" }}>NOVO ACESSO</small>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "4px 0" }}>Cadastrar Administrador</h2>
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  Adicione um novo membro para gerenciar as microempresas e a plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>
                  E-mail institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: carlos@comprasabertas.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>
                  Senha provisória *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <footer style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="ds-button secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ds-button primary"
                  disabled={submitting}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {submitting ? "Salvando..." : <><Plus size={16} /> Criar administrador</>}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal de confirmação para remover admin */}
      {confirmDeleteUser && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteUser(null)}>
          <section
            className="review-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "440px", width: "100%", padding: "24px" }}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#dc2626", margin: "0 0 10px 0" }}>
              Remover Administrador
            </h3>
            <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: "1.5" }}>
              Tem certeza que deseja revogar o acesso de administrador de <b>{confirmDeleteUser.name}</b> ({confirmDeleteUser.email})? Esta ação não pode ser desfeita.
            </p>
            <footer style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className="ds-button secondary"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={deletingId !== null}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ds-button"
                style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                onClick={() => void handleDelete(confirmDeleteUser)}
                disabled={deletingId !== null}
              >
                {deletingId === confirmDeleteUser.id ? "Removendo..." : "Confirmar remoção"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
