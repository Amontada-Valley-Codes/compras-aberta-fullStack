import { prisma } from "../../lib/prisma";
import { isStripeConfigured, stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import type { UserRole } from "../../../prisma/generated/prisma/client";

export interface CreatePlanDTO {
  name: string;
  targetRole?: UserRole;
  priceCents: number;
  interval?: "month" | "year";
  trialDays?: number;
  description?: string;
  features: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface UpdatePlanDTO {
  name?: string;
  targetRole?: UserRole;
  priceCents?: number;
  interval?: "month" | "year";
  trialDays?: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
}

const DEFAULT_PORTAL_PUBLICO = {
  name: "Portal Público",
  targetRole: "PUBLIC" as UserRole,
  priceCents: 0,
  interval: "month",
  trialDays: 0,
  description:
    "Para cidadãos que desejam acompanhar como os recursos públicos são utilizados.",
  features: [
    "Consulta de receitas e despesas",
    "Acesso às licitações e aos contratos",
    "Consulta de fornecedores",
    "Visualização dos gastos municipais",
    "Acesso sem assinatura",
  ],
  isActive: true,
  isFeatured: false,
  displayOrder: 0,
};

export const planService = {
  async ensureDefaultPlans() {
    const existing = await prisma.plan.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });

    if (existing.length === 0) {
      await prisma.plan.createMany({
        data: [
          DEFAULT_PORTAL_PUBLICO,
          {
            name: "Empresas em Geral",
            targetRole: "BUSINESS",
            priceCents: 2999,
            interval: "month",
            trialDays: 7,
            description:
              "Para empresas e fornecedores que desejam encontrar oportunidades de licitação e vender ao setor público.",
            features: [
              "Licitações compatíveis com o segmento",
              "Alertas personalizados",
              "Histórico de compras dos municípios",
              "Comparação entre municípios",
              "Consulta aos prazos de pagamento",
              "Análise de fornecedores e valores",
            ],
            isActive: true,
            isFeatured: true,
            displayOrder: 1,
          },
          {
            name: "Gestor Público",
            targetRole: "MANAGER",
            priceCents: 14999,
            interval: "month",
            trialDays: 7,
            description:
              "Para municípios e servidores públicos que precisam acompanhar recursos, compras, contratos e fornecedores.",
            features: [
              "Painel de receitas e despesas",
              "Acompanhamento de licitações e contratos",
              "Análise de fornecedores",
              "Indicadores municipais",
              "Comparações por período",
              "Relatórios",
              "Acesso para a equipe",
              "Suporte especializado",
            ],
            isActive: true,
            isFeatured: false,
            displayOrder: 2,
          },
        ],
      });
      return;
    }

    const hasPublicPlan = existing.some((p) => p.targetRole === "PUBLIC");
    if (!hasPublicPlan) {
      await prisma.$transaction([
        prisma.plan.create({
          data: DEFAULT_PORTAL_PUBLICO,
        }),
        ...existing.map((plan, index) =>
          prisma.plan.update({
            where: { id: plan.id },
            data: { displayOrder: index + 1 },
          })
        ),
      ]);
      return;
    }

    const allZero = existing.length > 1 && existing.every((p) => p.displayOrder === 0);
    if (allZero) {
      await prisma.$transaction(
        existing.map((plan, index) =>
          prisma.plan.update({
            where: { id: plan.id },
            data: { displayOrder: index },
          })
        )
      );
    }
  },

  async listAll() {
    await this.ensureDefaultPlans();
    return prisma.plan.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listActive() {
    await this.ensureDefaultPlans();
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async getById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new AppError("Plano não encontrado", 404);
    return plan;
  },

  async create(data: CreatePlanDTO) {
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;
    const role = data.targetRole || "BUSINESS";

    if (isStripeConfigured && data.priceCents > 0 && role !== "PUBLIC") {
      try {
        const stripeProduct = await stripe.products.create({
          name: data.name,
          description: data.description || undefined,
          active: data.isActive ?? true,
          metadata: {
            targetRole: role,
            trialDays: String(data.trialDays ?? 7),
          },
        });

        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: data.priceCents,
          currency: "brl",
          recurring: {
            interval: data.interval === "year" ? "year" : "month",
          },
        });

        stripeProductId = stripeProduct.id;
        stripePriceId = stripePrice.id;
      } catch (err) {
        console.warn("Aviso: não foi possível sincronizar novo plano na Stripe:", err);
      }
    }

    let nextOrder = data.displayOrder;
    if (nextOrder === undefined) {
      const aggregate = await prisma.plan.aggregate({
        _max: { displayOrder: true },
      });
      nextOrder = (aggregate._max.displayOrder ?? -1) + 1;
    }

    return prisma.plan.create({
      data: {
        name: data.name,
        targetRole: role,
        priceCents: data.priceCents,
        interval: data.interval || "month",
        trialDays: data.trialDays ?? (role === "PUBLIC" ? 0 : 7),
        description: data.description || null,
        features: data.features,
        stripeProductId,
        stripePriceId,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        displayOrder: nextOrder,
      },
    });
  },

  async update(id: string, data: UpdatePlanDTO) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Plano não encontrado", 404);
    }

    let stripeProductId = existing.stripeProductId;
    let stripePriceId = existing.stripePriceId;
    const targetRole = data.targetRole ?? existing.targetRole;
    const targetPriceCents = data.priceCents ?? existing.priceCents;

    if (isStripeConfigured && targetPriceCents > 0 && targetRole !== "PUBLIC") {
      try {
        if (!stripeProductId) {
          const product = await stripe.products.create({
            name: data.name || existing.name,
            description: data.description ?? existing.description ?? undefined,
            active: data.isActive ?? existing.isActive,
          });
          stripeProductId = product.id;
        } else if (
          data.name !== undefined ||
          data.description !== undefined ||
          data.isActive !== undefined
        ) {
          await stripe.products.update(stripeProductId, {
            ...(data.name ? { name: data.name } : {}),
            ...(data.description !== undefined
              ? { description: data.description || "" }
              : {}),
            ...(data.isActive !== undefined ? { active: data.isActive } : {}),
          });
        }

        const priceChanged =
          data.priceCents !== undefined && data.priceCents !== existing.priceCents;
        const intervalChanged =
          data.interval !== undefined && data.interval !== existing.interval;

        if ((priceChanged || intervalChanged || !stripePriceId) && stripeProductId) {
          const newPrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: targetPriceCents,
            currency: "brl",
            recurring: {
              interval:
                (data.interval || existing.interval) === "year" ? "year" : "month",
            },
          });

          if (stripePriceId && stripePriceId !== newPrice.id) {
            try {
              await stripe.prices.update(stripePriceId, { active: false });
            } catch {
              // Ignora se preço antigo não puder ser arquivado
            }
          }

          stripePriceId = newPrice.id;
        }
      } catch (err) {
        console.warn("Aviso: não foi possível sincronizar atualização na Stripe:", err);
      }
    }

    return prisma.plan.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.targetRole ? { targetRole: data.targetRole } : {}),
        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.interval ? { interval: data.interval } : {}),
        ...(data.trialDays !== undefined ? { trialDays: data.trialDays } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.features ? { features: data.features } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
        stripeProductId,
        stripePriceId,
      },
    });
  },

  async reorder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.plan.updateMany({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    return this.listAll();
  },

  async delete(id: string) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Plano não encontrado", 404);
    }

    if (isStripeConfigured && existing.stripeProductId) {
      try {
        await stripe.products.update(existing.stripeProductId, { active: false });
      } catch (err) {
        console.warn("Não foi possível desativar produto no Stripe:", err);
      }
    }

    return prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
