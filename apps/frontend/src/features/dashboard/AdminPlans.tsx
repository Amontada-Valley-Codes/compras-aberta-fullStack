"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Edit3,
  Eye,
  Landmark,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeading } from "./MeDashboard";
import { initials } from "./useAccessRequests";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PlanItem {
  id: string;
  name: string;
  targetRole: "BUSINESS" | "MANAGER" | "ADMIN";
  priceCents: number;
  interval: "month" | "year";
  trialDays: number;
  description: string | null;
  features: string[];
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

type RoleFilter = "ALL" | "BUSINESS" | "MANAGER";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function AdminPlans() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [viewingPlan, setViewingPlan] = useState<PlanItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"BUSINESS" | "MANAGER">("BUSINESS");
  const [formPrice, setFormPrice] = useState("23.99");
  const [formTrialDays, setFormTrialDays] = useState(7);
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formNewFeature, setFormNewFeature] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      } else {
        toast.error("Erro ao carregar planos.");
      }
    } catch {
      toast.error("Falha na conexão ao carregar planos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const visiblePlans = useMemo(() => {
    if (roleFilter === "ALL") return plans;
    return plans.filter((plan) => plan.targetRole === roleFilter);
  }, [plans, roleFilter]);

  function handleOpenCreate() {
    setViewingPlan(null);
    setIsCreating(true);
    setEditingPlan(null);
    setFormName("");
    setFormRole("BUSINESS");
    setFormPrice("23.99");
    setFormTrialDays(7);
    setFormDescription("");
    setFormFeatures([
      "Licitações compatíveis com o segmento da empresa",
      "Alertas personalizados de novas oportunidades",
      "Histórico de compras dos municípios",
    ]);
    setFormNewFeature("");
    setFormIsActive(true);
    setFormIsFeatured(false);
  }

  function handleOpenEdit(plan: PlanItem) {
    setViewingPlan(null);
    setIsCreating(false);
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormRole(plan.targetRole === "MANAGER" ? "MANAGER" : "BUSINESS");
    setFormPrice((plan.priceCents / 100).toFixed(2));
    setFormTrialDays(plan.trialDays);
    setFormDescription(plan.description || "");
    setFormFeatures(Array.isArray(plan.features) ? [...plan.features] : []);
    setFormNewFeature("");
    setFormIsActive(plan.isActive);
    setFormIsFeatured(plan.isFeatured);
  }

  function handleCloseModal() {
    setEditingPlan(null);
    setIsCreating(false);
    setViewingPlan(null);
  }

  function handleAddFeature() {
    const trimmed = formNewFeature.trim();
    if (!trimmed) return;
    setFormFeatures((prev) => [...prev, trimmed]);
    setFormNewFeature("");
  }

  function handleRemoveFeature(index: number) {
    setFormFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }

    const priceNumber = parseFloat(formPrice.replace(",", "."));
    if (isNaN(priceNumber) || priceNumber < 0) {
      toast.error("Informe um valor válido em reais.");
      return;
    }

    setSaving(true);
    const priceCents = Math.round(priceNumber * 100);

    const payload = {
      name: formName.trim(),
      targetRole: formRole,
      priceCents,
      trialDays: Number(formTrialDays),
      description: formDescription.trim(),
      features: formFeatures,
      isActive: formIsActive,
      isFeatured: formIsFeatured,
    };

    try {
      const res = isCreating
        ? await fetch("/api/admin/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/plans/${encodeURIComponent(editingPlan!.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Erro ao salvar plano", {
          description: body.message || "Verifique os dados informados.",
        });
        return;
      }

      toast.success(
        isCreating
          ? "Plano criado com sucesso!"
          : "Plano atualizado com sucesso!",
      );

      handleCloseModal();
      void loadPlans();
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="FATURAMENTO & ASSINATURAS"
        title="Planos e preços"
        description="Gerencie os planos, valores mensais, período de demonstração e benefícios disponíveis na plataforma."
        action={
          <button type="button" className="ds-button primary" onClick={handleOpenCreate}>
            <Plus size={17} /> Novo plano
          </button>
        }
      />

      <section className="request-tabs">
        <button
          className={roleFilter === "ALL" ? "active" : ""}
          onClick={() => setRoleFilter("ALL")}
        >
          Todos <em>{plans.length}</em>
        </button>
        <button
          className={roleFilter === "BUSINESS" ? "active" : ""}
          onClick={() => setRoleFilter("BUSINESS")}
        >
          Empresas em Geral <em>{plans.filter((p) => p.targetRole === "BUSINESS").length}</em>
        </button>
        <button
          className={roleFilter === "MANAGER" ? "active" : ""}
          onClick={() => setRoleFilter("MANAGER")}
        >
          Gestor Público <em>{plans.filter((p) => p.targetRole === "MANAGER").length}</em>
        </button>
      </section>

      {!loading && visiblePlans.length > 0 && (
        <div className="integration-grid" style={{ marginBottom: "20px" }}>
          {visiblePlans.map((plan) => {
            const formattedPrice = formatBRL(plan.priceCents);
            return (
              <article key={plan.id} className="dashboard-card integration-card">
                <header>
                  <span>
                    {plan.targetRole === "MANAGER" ? (
                      <Landmark size={19} />
                    ) : (
                      <Building2 size={19} />
                    )}
                  </span>
                  <div className="plan-status-badges">
                    {plan.isFeatured && (
                      <em className="table-status">
                        <Sparkles size={12} /> Recomendado
                      </em>
                    )}
                    <em
                      className={`table-status ${
                        plan.isActive ? "status-aprovada" : "status-recusada"
                      }`}
                    >
                      {plan.isActive ? "● Ativo no portal" : "○ Inativo"}
                    </em>
                  </div>
                </header>

                <h2>{plan.name}</h2>
                <p>
                  {plan.description ||
                    "Plano com acesso completo às ferramentas de monitoramento da plataforma."}
                </p>

                <dl>
                  <div>
                    <dt>Valor mensal</dt>
                    <dd>{formattedPrice}/mês</dd>
                  </div>
                  <div>
                    <dt>Demonstração gratuita</dt>
                    <dd>{plan.trialDays} dias grátis</dd>
                  </div>
                  <div>
                    <dt>Público-alvo</dt>
                    <dd>
                      {plan.targetRole === "MANAGER"
                        ? "Gestor Público"
                        : "Empresas em Geral"}
                    </dd>
                  </div>
                  <div>
                    <dt>Disponibilidade</dt>
                    <dd>{plan.isActive ? "Liberado para assinatura" : "Pausado"}</dd>
                  </div>
                </dl>

                {plan.features.length > 0 && (
                  <ul className="plan-features-preview">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx}>
                        <Check />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="integration-card__actions">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setViewingPlan(plan)}
                  >
                    <Eye size={15} /> Ver situação
                  </button>
                  <button
                    type="button"
                    className="ds-button secondary sm"
                    onClick={() => handleOpenEdit(plan)}
                  >
                    <Edit3 size={15} /> Editar plano
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="dashboard-card admin-table-card full-table">
        <div className="table-summary">
          <p>
            <b>{visiblePlans.length}</b>{" "}
            {visiblePlans.length === 1
              ? "plano configurado — acompanhamento de situação"
              : "planos configurados — acompanhamento de situação"}
          </p>
          <button onClick={() => void loadPlans()} disabled={loading}>
            Atualizar lista
          </button>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plano & Público</th>
                <th>Situação no Portal</th>
                <th>Valor Mensal</th>
                <th>Demonstração</th>
                <th>Benefícios</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-state" colSpan={6}>
                    Carregando planos...
                  </td>
                </tr>
              ) : visiblePlans.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan={6}>
                    Nenhum plano encontrado.
                  </td>
                </tr>
              ) : (
                visiblePlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <span className="company-cell">
                        <i>{initials(plan.name)}</i>
                        <span>
                          <b>{plan.name}</b>
                          <small>
                            {plan.targetRole === "MANAGER"
                              ? "Público: Gestor Público"
                              : "Público: Empresas em Geral"}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="admin-status-cell">
                        <em
                          className={`table-status ${
                            plan.isActive ? "status-aprovada" : "status-recusada"
                          }`}
                        >
                          {plan.isActive ? "● Ativo" : "○ Inativo"}
                        </em>
                        <small>
                          {plan.isFeatured
                            ? "Destaque na Landing Page"
                            : "Exibição padrão"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <b>{formatBRL(plan.priceCents)}</b>
                      <small>Cobrança mensal</small>
                    </td>
                    <td>
                      <b>{plan.trialDays} dias grátis</b>
                      <small>Liberado no cadastro</small>
                    </td>
                    <td>
                      <b>{plan.features.length} benefícios</b>
                      <small>Inclusos no pacote</small>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => setViewingPlan(plan)}
                        >
                          Situação
                        </button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => handleOpenEdit(plan)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Centralizado 1: Visualizar Situação Completa do Plano */}
      {viewingPlan && (
        <div
          className="ws-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="ws-select-modal admin-plan-modal">
            <div className="ws-select-modal__header">
              <div>
                <h2>Situação do plano: {viewingPlan.name}</h2>
                <p>
                  Resumo de disponibilidade na Landing Page, valores mensais, período gratuito e benefícios inclusos.
                </p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={handleCloseModal}
                aria-label="Fechar janela"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ws-select-modal__body">
              <div className="review-section" style={{ paddingBottom: "16px", marginBottom: "16px" }}>
                <dl>
                  <div>
                    <dt>Situação no Catálogo</dt>
                    <dd>
                      <em
                        className={`table-status ${
                          viewingPlan.isActive ? "status-aprovada" : "status-recusada"
                        }`}
                      >
                        {viewingPlan.isActive ? "● Ativo na Landing Page" : "○ Inativo / Oculto"}
                      </em>
                    </dd>
                  </div>
                  <div>
                    <dt>Destaque Comercial</dt>
                    <dd>
                      {viewingPlan.isFeatured ? "Plano em destaque (Recomendado)" : "Exibição padrão"}
                    </dd>
                  </div>
                  <div>
                    <dt>Valor da Assinatura</dt>
                    <dd>{formatBRL(viewingPlan.priceCents)} / mês</dd>
                  </div>
                  <div>
                    <dt>Período de Demonstração</dt>
                    <dd>{viewingPlan.trialDays} dias gratuitos no cadastro</dd>
                  </div>
                  <div>
                    <dt>Público-Alvo</dt>
                    <dd>
                      {viewingPlan.targetRole === "MANAGER"
                        ? "Gestor Público (Prefeituras e Órgãos)"
                        : "Empresas em Geral (Fornecedores)"}
                    </dd>
                  </div>
                  <div>
                    <dt>Total de Benefícios</dt>
                    <dd>{viewingPlan.features.length} benefícios ativos</dd>
                  </div>
                </dl>
              </div>

              <div className="admin-plan-modal__section" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                <h3>Benefícios entregues neste plano ({viewingPlan.features.length})</h3>
                <div className="dashboard-card registry-list">
                  {viewingPlan.features.map((feat, idx) => (
                    <article key={idx}>
                      <span>{idx + 1}</span>
                      <div>
                        <b>{feat}</b>
                        <small>Disponível para assinantes e durante os {viewingPlan.trialDays} dias grátis</small>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="ws-select-modal__footer">
              <span className="ws-select-modal__counter">
                Atualização automática na Landing Page
              </span>
              <div className="ws-select-modal__actions">
                <button
                  type="button"
                  className="ds-button secondary sm"
                  onClick={handleCloseModal}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="ds-button primary sm"
                  onClick={() => handleOpenEdit(viewingPlan)}
                >
                  <Edit3 size={15} /> Editar este plano
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Centralizado 2: Criar ou Editar Plano */}
      {(editingPlan || isCreating) && (
        <div
          className="ws-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="ws-select-modal admin-plan-modal">
            <div className="ws-select-modal__header">
              <div>
                <h2>
                  {isCreating
                    ? "Cadastrar novo plano"
                    : `Editar plano: ${editingPlan?.name}`}
                </h2>
                <p>
                  Configure o valor mensal, dias de demonstração gratuita e os benefícios entregues ao assinante.
                </p>
              </div>
              <button
                type="button"
                className="ws-modal-close"
                onClick={handleCloseModal}
                aria-label="Fechar janela"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ws-select-modal__body">
              <div className="admin-plan-modal__grid">
                <div className="ws-field">
                  <label>Nome do plano *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Empresas em Geral"
                  />
                </div>

                <div className="ws-field">
                  <label>Público-alvo</label>
                  <Select
                    value={formRole}
                    onValueChange={(v) =>
                      setFormRole(v as "BUSINESS" | "MANAGER")
                    }
                  >
                    <SelectTrigger aria-label="Público-alvo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUSINESS">Empresas em Geral</SelectItem>
                      <SelectItem value="MANAGER">Gestor Público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="ws-field">
                  <label>Valor mensal (R$) *</label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="23.99"
                  />
                </div>

                <div className="ws-field">
                  <label>Dias de demonstração gratuita</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={formTrialDays}
                    onChange={(e) => setFormTrialDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="ws-field" style={{ marginTop: "12px" }}>
                <label>Descrição curta do plano</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Para empresas de todos os portes que desejam encontrar editais compatíveis e vender ao setor público."
                />
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="toggle-row">
                  <span>
                    <b>Plano ativo no catálogo</b>
                    <small>Exibe na Landing Page e permite novas assinaturas</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                </label>

                <label className="toggle-row">
                  <span>
                    <b>Destacar como recomendado</b>
                    <small>Adiciona o selo de destaque na seção de planos</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                  />
                </label>
              </div>

              <div className="admin-plan-modal__section">
                <h3>Benefícios liberados para o usuário ({formFeatures.length})</h3>

                <div className="dashboard-card filter-bar" style={{ marginBottom: "12px" }}>
                  <label>
                    <Plus size={18} />
                    <input
                      type="text"
                      value={formNewFeature}
                      onChange={(e) => setFormNewFeature(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="Digite um novo benefício e clique em Adicionar..."
                    />
                  </label>
                  <button
                    type="button"
                    className="table-action"
                    onClick={handleAddFeature}
                  >
                    Adicionar
                  </button>
                </div>

                <div className="dashboard-card registry-list">
                  {formFeatures.length === 0 ? (
                    <article>
                      <div>
                        <b>Nenhum benefício configurado</b>
                        <small>Adicione itens acima para listar o que o plano oferece.</small>
                      </div>
                    </article>
                  ) : (
                    formFeatures.map((feat, index) => (
                      <article key={index}>
                        <span>{index + 1}</span>
                        <div>
                          <b>{feat}</b>
                          <small>Incluído no plano {formName || "selecionado"}</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                        >
                          Remover
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="ws-select-modal__footer">
              <span className="ws-select-modal__counter">
                {formFeatures.length}{" "}
                {formFeatures.length === 1 ? "benefício configurado" : "benefícios configurados"}
              </span>
              <div className="ws-select-modal__actions">
                <button
                  type="button"
                  className="ds-button secondary sm"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ds-button primary sm"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Salvando alterações...
                    </>
                  ) : (
                    <>
                      <Check size={15} /> Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
