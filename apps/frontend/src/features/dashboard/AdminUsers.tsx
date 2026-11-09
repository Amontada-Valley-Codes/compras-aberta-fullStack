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
                            fontSize: "var(--text-xs)",
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
                          <span style={{ fontSize: "var(--text-xs)", color: "#94a3b8" }}>—</span>
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
                              fontSize: "var(--text-xs)",
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

      {/* Modal centralizado de cadastro de novo admin */}
      {showAddModal && (
        <div
          className="ws-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            className="ws-select-modal"
            style={{ width: "min(500px, 100%)" }}
          >
            <div className="ws-select-modal__header">
              <div>
                <h2>Cadastrar Administrador</h2>
                <p>
                  Adicione um novo membro para gerenciar as empresas e a plataforma.
                </p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div
                className="ws-select-modal__body"
                style={{ minHeight: "auto", display: "grid", gap: "14px" }}
              >
                <div className="ws-field">
                  <label>Nome completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="ws-field">
                  <label>E-mail institucional *</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: carlos@comprasabertas.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="ws-field">
                  <label>Senha provisória *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="ws-select-modal__footer">
                <span className="ws-select-modal__counter">Acesso administrativo total</span>
                <div className="ws-select-modal__actions">
                  <button
                    type="button"
                    className="ds-button secondary sm"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="ds-button primary sm"
                    disabled={submitting}
                  >
                    {submitting ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Plus size={16} /> Criar administrador
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal centralizado de confirmação para remover admin */}
      {confirmDeleteUser && (
        <div
          className="ws-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeleteUser(null);
          }}
        >
          <div
            className="ws-select-modal"
            style={{ width: "min(460px, 100%)" }}
          >
            <div className="ws-select-modal__header">
              <div>
                <h2 style={{ color: "#dc2626" }}>Remover Administrador</h2>
                <p>Confirme a revogação de acesso ao painel administrativo.</p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={() => setConfirmDeleteUser(null)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ws-select-modal__body" style={{ minHeight: "auto" }}>
              <p style={{ color: "#475569", fontSize: "var(--text-sm)", margin: 0 }}>
                Tem certeza que deseja revogar o acesso de administrador de{" "}
                <b>{confirmDeleteUser.name}</b> ({confirmDeleteUser.email})? Esta
                ação não pode ser desfeita.
              </p>
            </div>

            <div className="ws-select-modal__footer">
              <span />
              <div className="ws-select-modal__actions">
                <button
                  type="button"
                  className="ds-button secondary sm"
                  onClick={() => setConfirmDeleteUser(null)}
                  disabled={deletingId !== null}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ds-button sm"
                  style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                  onClick={() => void handleDelete(confirmDeleteUser)}
                  disabled={deletingId !== null}
                >
                  {deletingId === confirmDeleteUser.id
                    ? "Removendo..."
                    : "Confirmar remoção"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
