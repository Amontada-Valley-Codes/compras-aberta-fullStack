"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Edit3,
  Eye,
  Globe,
  GripVertical,
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
  targetRole: "PUBLIC" | "BUSINESS" | "MANAGER" | "ADMIN";
  priceCents: number;
  interval: "month" | "year";
  trialDays: number;
  description: string | null;
  features: string[];
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

type RoleFilter = "ALL" | "PUBLIC" | "BUSINESS" | "MANAGER";

function formatBRL(cents: number) {
  if (cents === 0) return "Gratuito";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getRoleLabel(role: PlanItem["targetRole"]) {
  if (role === "PUBLIC") return "Portal Público (Cidadãos)";
  if (role === "MANAGER") return "Gestor Público";
  return "Empresas em Geral";
}

export function AdminPlans() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [viewingPlan, setViewingPlan] = useState<PlanItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Drag-and-drop states
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [dragOverPlanId, setDragOverPlanId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"PUBLIC" | "BUSINESS" | "MANAGER">(
    "BUSINESS",
  );
  const [formPrice, setFormPrice] = useState("23.99");
  const [formTrialDays, setFormTrialDays] = useState(7);
  const [formPosition, setFormPosition] = useState(1);
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formNewFeature, setFormNewFeature] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as PlanItem[];
        const sorted = [...data].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
        setPlans(sorted);
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

  async function saveNewOrder(nextPlans: PlanItem[]) {
    const previousPlans = plans;
    const normalized = nextPlans.map((item, idx) => ({
      ...item,
      displayOrder: idx,
    }));
    setPlans(normalized);
    setReordering(true);

    try {
      const res = await fetch("/api/admin/plans/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: normalized.map((p) => p.id),
        }),
      });

      if (!res.ok) {
        setPlans(previousPlans);
        toast.error("Não foi possível salvar a nova ordem dos planos.");
        return;
      }

      const updated = (await res.json()) as PlanItem[];
      if (Array.isArray(updated)) {
        setPlans(
          [...updated].sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
          ),
        );
      }
      toast.success("Ordem de exibição na Landing Page atualizada!");
    } catch {
      setPlans(previousPlans);
      toast.error("Erro ao comunicar com o servidor para salvar a ordem.");
    } finally {
      setReordering(false);
    }
  }

  function handleMovePlan(planId: string, direction: -1 | 1) {
    const fromIndex = plans.findIndex((p) => p.id === planId);
    const toIndex = fromIndex + direction;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= plans.length) return;

    const next = [...plans];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void saveNewOrder(next);
  }

  function handleDragStart(e: React.DragEvent, planId: string) {
    setDraggedPlanId(planId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", planId);
  }

  function handleDragOver(e: React.DragEvent, targetPlanId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverPlanId !== targetPlanId) {
      setDragOverPlanId(targetPlanId);
    }
  }

  function handleDragLeave(targetPlanId: string) {
    if (dragOverPlanId === targetPlanId) {
      setDragOverPlanId(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetPlanId: string) {
    e.preventDefault();
    const sourcePlanId =
      draggedPlanId || e.dataTransfer.getData("text/plain");
    setDraggedPlanId(null);
    setDragOverPlanId(null);

    if (!sourcePlanId || sourcePlanId === targetPlanId) return;

    const fromIndex = plans.findIndex((p) => p.id === sourcePlanId);
    const toIndex = plans.findIndex((p) => p.id === targetPlanId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const next = [...plans];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void saveNewOrder(next);
  }

  function handleDragEnd() {
    setDraggedPlanId(null);
    setDragOverPlanId(null);
  }

  function handleOpenCreate() {
    setViewingPlan(null);
    setIsCreating(true);
    setEditingPlan(null);
    setFormName("");
    setFormRole("BUSINESS");
    setFormPrice("23.99");
    setFormTrialDays(7);
    setFormPosition(plans.length + 1);
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
    const currentIndex = plans.findIndex((p) => p.id === plan.id);
    setViewingPlan(null);
    setIsCreating(false);
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormRole(
      plan.targetRole === "PUBLIC"
        ? "PUBLIC"
        : plan.targetRole === "MANAGER"
          ? "MANAGER"
          : "BUSINESS",
    );
    setFormPrice((plan.priceCents / 100).toFixed(2));
    setFormTrialDays(plan.trialDays);
    setFormPosition(
      currentIndex !== -1 ? currentIndex + 1 : (plan.displayOrder ?? 0) + 1,
    );
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

    const priceNumber =
      formRole === "PUBLIC" && formPrice.trim() === ""
        ? 0
        : parseFloat(formPrice.replace(",", "."));
    if (isNaN(priceNumber) || priceNumber < 0) {
      toast.error("Informe um valor válido em reais.");
      return;
    }

    setSaving(true);
    const priceCents = Math.round(priceNumber * 100);
    const desiredIndex = Math.max(0, Number(formPosition || 1) - 1);

    const payload = {
      name: formName.trim(),
      targetRole: formRole,
      priceCents,
      trialDays: Number(formTrialDays),
      description: formDescription.trim(),
      features: formFeatures,
      isActive: formIsActive,
      isFeatured: formIsFeatured,
      displayOrder: desiredIndex,
    };

    try {
      const res = isCreating
        ? await fetch("/api/admin/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(
            `/api/admin/plans/${encodeURIComponent(editingPlan!.id)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Erro ao salvar plano", {
          description: body.message || "Verifique os dados informados.",
        });
        return;
      }

      // Garante que a posição escolhida no modal reorganize todos os planos na sequência correta
      const savedPlanId: string | undefined = body?.id || editingPlan?.id;
      if (savedPlanId) {
        const otherIds = plans
          .filter((p) => p.id !== savedPlanId)
          .map((p) => p.id);
        const clampedIndex = Math.min(desiredIndex, otherIds.length);
        otherIds.splice(clampedIndex, 0, savedPlanId);

        await fetch("/api/admin/plans/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: otherIds }),
        }).catch(() => undefined);
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
        description="Gerencie os planos, valores mensais, período de demonstração e arraste os cards para definir a ordem na Landing Page."
        action={
          <button
            type="button"
            className="ds-button primary"
            onClick={handleOpenCreate}
          >
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
          className={roleFilter === "PUBLIC" ? "active" : ""}
          onClick={() => setRoleFilter("PUBLIC")}
        >
          Portal Público{" "}
          <em>{plans.filter((p) => p.targetRole === "PUBLIC").length}</em>
        </button>
        <button
          className={roleFilter === "BUSINESS" ? "active" : ""}
          onClick={() => setRoleFilter("BUSINESS")}
        >
          Empresas em Geral{" "}
          <em>{plans.filter((p) => p.targetRole === "BUSINESS").length}</em>
        </button>
        <button
          className={roleFilter === "MANAGER" ? "active" : ""}
          onClick={() => setRoleFilter("MANAGER")}
        >
          Gestor Público{" "}
          <em>{plans.filter((p) => p.targetRole === "MANAGER").length}</em>
        </button>
      </section>

      {!loading && visiblePlans.length > 0 && (
        <>
          <div className="plan-reorder-hint">
            <span>
              <GripVertical size={16} />
              Arraste e solte os cards (ou as linhas da tabela) para organizar a
              ordem em que os planos aparecem na Landing Page.
            </span>
            {reordering && (
              <em>
                <RefreshCw size={13} className="spin" /> Salvando ordem...
              </em>
            )}
          </div>

          <div
            className="integration-grid plans-admin-grid"
            style={{ marginBottom: "20px" }}
          >
            {visiblePlans.map((plan) => {
              const formattedPrice = formatBRL(plan.priceCents);
              const isFree =
                plan.priceCents === 0 || plan.targetRole === "PUBLIC";
              const globalIndex = plans.findIndex((p) => p.id === plan.id);
              const positionNumber =
                globalIndex !== -1 ? globalIndex + 1 : plan.displayOrder + 1;
              const isDragging = draggedPlanId === plan.id;
              const isDragOver =
                dragOverPlanId === plan.id && draggedPlanId !== plan.id;

              return (
                <article
                  key={plan.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, plan.id)}
                  onDragOver={(e) => handleDragOver(e, plan.id)}
                  onDragLeave={() => handleDragLeave(plan.id)}
                  onDrop={(e) => handleDrop(e, plan.id)}
                  onDragEnd={handleDragEnd}
                  className={`dashboard-card integration-card plan-draggable-card${
                    isDragging ? " is-dragging" : ""
                  }${isDragOver ? " is-drag-over" : ""}`}
                >
                  <header>
                    <div className="plan-card-head-left">
                      <span>
                        {plan.targetRole === "PUBLIC" ? (
                          <Globe size={19} />
                        ) : plan.targetRole === "MANAGER" ? (
                          <Landmark size={19} />
                        ) : (
                          <Building2 size={19} />
                        )}
                      </span>
                      <div className="plan-order-controls">
                        <span
                          className="plan-order-badge"
                          title="Arraste este card para alterar a posição na Landing Page"
                        >
                          <GripVertical size={14} /> {positionNumber}º na
                          Landing
                        </span>
                        <div className="plan-order-arrows">
                          <button
                            type="button"
                            className="plan-order-arrow-btn"
                            title="Mover para trás na fila"
                            disabled={globalIndex <= 0 || reordering}
                            onClick={() => handleMovePlan(plan.id, -1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            className="plan-order-arrow-btn"
                            title="Mover para frente na fila"
                            disabled={
                              globalIndex === -1 ||
                              globalIndex >= plans.length - 1 ||
                              reordering
                            }
                            onClick={() => handleMovePlan(plan.id, 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

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
                      <dd>{isFree ? "Gratuito" : `${formattedPrice}/mês`}</dd>
                    </div>
                    <div>
                      <dt>Demonstração gratuita</dt>
                      <dd>
                        {isFree && plan.trialDays === 0
                          ? "Acesso livre"
                          : `${plan.trialDays} dias grátis`}
                      </dd>
                    </div>
                    <div>
                      <dt>Público-alvo</dt>
                      <dd>{getRoleLabel(plan.targetRole)}</dd>
                    </div>
                    <div>
                      <dt>Ordem na Landing Page</dt>
                      <dd>{positionNumber}º card exibido</dd>
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
        </>
      )}

      <section className="dashboard-card admin-table-card full-table">
        <div className="table-summary">
          <p>
            <b>{visiblePlans.length}</b>{" "}
            {visiblePlans.length === 1
              ? "plano configurado — arraste as linhas para reordenar na Landing Page"
              : "planos configurados — arraste as linhas para reordenar na Landing Page"}
          </p>
          <button onClick={() => void loadPlans()} disabled={loading}>
            Atualizar lista
          </button>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "130px" }}>Ordem na Landing</th>
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
                  <td className="table-state" colSpan={7}>
                    Carregando planos...
                  </td>
                </tr>
              ) : visiblePlans.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan={7}>
                    Nenhum plano encontrado.
                  </td>
                </tr>
              ) : (
                visiblePlans.map((plan) => {
                  const globalIndex = plans.findIndex((p) => p.id === plan.id);
                  const positionNumber =
                    globalIndex !== -1
                      ? globalIndex + 1
                      : plan.displayOrder + 1;
                  const isFree =
                    plan.priceCents === 0 || plan.targetRole === "PUBLIC";
                  const isDragging = draggedPlanId === plan.id;
                  const isDragOver =
                    dragOverPlanId === plan.id && draggedPlanId !== plan.id;

                  return (
                    <tr
                      key={plan.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, plan.id)}
                      onDragOver={(e) => handleDragOver(e, plan.id)}
                      onDragLeave={() => handleDragLeave(plan.id)}
                      onDrop={(e) => handleDrop(e, plan.id)}
                      onDragEnd={handleDragEnd}
                      className={`plan-draggable-row${
                        isDragging ? " is-dragging" : ""
                      }${isDragOver ? " is-drag-over" : ""}`}
                    >
                      <td>
                        <div className="plan-order-controls">
                          <span
                            className="plan-order-badge"
                            title="Arraste a linha para mudar a posição"
                          >
                            <GripVertical size={14} /> {positionNumber}º lugar
                          </span>
                          <div className="plan-order-arrows">
                            <button
                              type="button"
                              className="plan-order-arrow-btn"
                              title="Subir posição"
                              disabled={globalIndex <= 0 || reordering}
                              onClick={() => handleMovePlan(plan.id, -1)}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="plan-order-arrow-btn"
                              title="Descer posição"
                              disabled={
                                globalIndex === -1 ||
                                globalIndex >= plans.length - 1 ||
                                reordering
                              }
                              onClick={() => handleMovePlan(plan.id, 1)}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="company-cell">
                          <i>{initials(plan.name)}</i>
                          <span>
                            <b>{plan.name}</b>
                            <small>
                              Público: {getRoleLabel(plan.targetRole)}
                            </small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <div className="admin-status-cell">
                          <em
                            className={`table-status ${
                              plan.isActive
                                ? "status-aprovada"
                                : "status-recusada"
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
                        <small>
                          {isFree ? "Acesso público" : "Cobrança mensal"}
                        </small>
                      </td>
                      <td>
                        <b>
                          {isFree && plan.trialDays === 0
                            ? "Ilimitado"
                            : `${plan.trialDays} dias grátis`}
                        </b>
                        <small>
                          {isFree && plan.trialDays === 0
                            ? "Sem necessidade de assinatura"
                            : "Liberado no cadastro"}
                        </small>
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
                  );
                })
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
                  Resumo de disponibilidade na Landing Page, posição, valores
                  mensais, período gratuito e benefícios inclusos.
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
              <div
                className="review-section"
                style={{ paddingBottom: "16px", marginBottom: "16px" }}
              >
                <dl>
                  <div>
                    <dt>Situação no Catálogo</dt>
                    <dd>
                      <em
                        className={`table-status ${
                          viewingPlan.isActive
                            ? "status-aprovada"
                            : "status-recusada"
                        }`}
                      >
                        {viewingPlan.isActive
                          ? "● Ativo na Landing Page"
                          : "○ Inativo / Oculto"}
                      </em>
                    </dd>
                  </div>
                  <div>
                    <dt>Posição na Landing Page</dt>
                    <dd>
                      {(plans.findIndex((p) => p.id === viewingPlan.id) + 1) ||
                        viewingPlan.displayOrder + 1}
                      º card exibido
                    </dd>
                  </div>
                  <div>
                    <dt>Destaque Comercial</dt>
                    <dd>
                      {viewingPlan.isFeatured
                        ? "Plano em destaque (Recomendado)"
                        : "Exibição padrão"}
                    </dd>
                  </div>
                  <div>
                    <dt>Valor da Assinatura</dt>
                    <dd>
                      {viewingPlan.priceCents === 0
                        ? "Gratuito"
                        : `${formatBRL(viewingPlan.priceCents)} / mês`}
                    </dd>
                  </div>
                  <div>
                    <dt>Período de Demonstração</dt>
                    <dd>
                      {viewingPlan.priceCents === 0 &&
                      viewingPlan.trialDays === 0
                        ? "Acesso livre sem cobrança"
                        : `${viewingPlan.trialDays} dias gratuitos no cadastro`}
                    </dd>
                  </div>
                  <div>
                    <dt>Público-Alvo</dt>
                    <dd>{getRoleLabel(viewingPlan.targetRole)}</dd>
                  </div>
                </dl>
              </div>

              <div
                className="admin-plan-modal__section"
                style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}
              >
                <h3>
                  Benefícios entregues neste plano ({viewingPlan.features.length}
                  )
                </h3>
                <div className="dashboard-card registry-list">
                  {viewingPlan.features.map((feat, idx) => (
                    <article key={idx}>
                      <span>{idx + 1}</span>
                      <div>
                        <b>{feat}</b>
                        <small>
                          {viewingPlan.priceCents === 0
                            ? "Disponível gratuitamente no Portal Público"
                            : `Disponível para assinantes e durante os ${viewingPlan.trialDays} dias grátis`}
                        </small>
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
                  Configure o valor mensal, a ordem de exibição na Landing Page,
                  dias de demonstração gratuita e os benefícios entregues.
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
                    onValueChange={(v) => {
                      const nextRole = v as "PUBLIC" | "BUSINESS" | "MANAGER";
                      setFormRole(nextRole);
                      if (nextRole === "PUBLIC") {
                        setFormPrice("0.00");
                        setFormTrialDays(0);
                      }
                    }}
                  >
                    <SelectTrigger aria-label="Público-alvo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">
                        Portal Público (Gratuito)
                      </SelectItem>
                      <SelectItem value="BUSINESS">
                        Empresas em Geral
                      </SelectItem>
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
                    placeholder="23.99 (ou 0.00 para Gratuito)"
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

                <div className="ws-field">
                  <label>Posição na Landing Page (1º, 2º, 3º...)</label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, plans.length + (isCreating ? 1 : 0))}
                    value={formPosition}
                    onChange={(e) =>
                      setFormPosition(Math.max(1, Number(e.target.value)))
                    }
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
                    <small>
                      Exibe na Landing Page e permite acesso/assinaturas
                    </small>
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
                    <small>
                      Adiciona o destaque visual azul-marinho na seção de planos
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                  />
                </label>
              </div>

              <div className="admin-plan-modal__section">
                <h3>
                  Benefícios liberados para o usuário ({formFeatures.length})
                </h3>

                <div
                  className="dashboard-card filter-bar"
                  style={{ marginBottom: "12px" }}
                >
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
                        <small>
                          Adicione itens acima para listar o que o plano
                          oferece.
                        </small>
                      </div>
                    </article>
                  ) : (
                    formFeatures.map((feat, index) => (
                      <article key={index}>
                        <span>{index + 1}</span>
                        <div>
                          <b>{feat}</b>
                          <small>
                            Incluído no plano {formName || "selecionado"}
                          </small>
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
                {formFeatures.length === 1
                  ? "benefício configurado"
                  : "benefícios configurados"}
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
                      <RefreshCw size={15} className="spin" /> Salvando
                      alterações...
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
