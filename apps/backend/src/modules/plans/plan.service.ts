import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
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
}

export const planService = {
  async listAll() {
    return prisma.plan.findMany({
      orderBy: { createdAt: "asc" },
    });
  },

  async listActive() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async getById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new AppError("Plano não encontrado", 404);
    return plan;
  },

  async create(data: CreatePlanDTO) {
    // 1. Cria o Produto no Stripe
    const stripeProduct = await stripe.products.create({
      name: data.name,
      description: data.description || undefined,
      active: data.isActive ?? true,
      metadata: {
        targetRole: data.targetRole || "BUSINESS",
        trialDays: String(data.trialDays ?? 7),
      },
    });

    // 2. Cria o Preço no Stripe vinculado ao produto
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: data.priceCents,
      currency: "brl",
      recurring: {
        interval: data.interval === "year" ? "year" : "month",
      },
    });

    // 3. Salva no banco com os IDs gerados pela Stripe
    return prisma.plan.create({
      data: {
        name: data.name,
        targetRole: data.targetRole || "BUSINESS",
        priceCents: data.priceCents,
        interval: data.interval || "month",
        trialDays: data.trialDays ?? 7,
        description: data.description || null,
        features: data.features,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
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

    // 1. Se não tinha produto no Stripe ainda, cria agora
    if (!stripeProductId) {
      const product = await stripe.products.create({
        name: data.name || existing.name,
        description: data.description ?? existing.description ?? undefined,
        active: data.isActive ?? existing.isActive,
      });
      stripeProductId = product.id;
    } else if (data.name !== undefined || data.description !== undefined || data.isActive !== undefined) {
      // Atualiza nome/descrição/ativo do produto no Stripe
      await stripe.products.update(stripeProductId, {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || "" } : {}),
        ...(data.isActive !== undefined ? { active: data.isActive } : {}),
      });
    }

    // 2. Se o preço mudou (ou não tinha priceId), cria um novo preço na Stripe
    const priceChanged = data.priceCents !== undefined && data.priceCents !== existing.priceCents;
    const intervalChanged = data.interval !== undefined && data.interval !== existing.interval;

    if (priceChanged || intervalChanged || !stripePriceId) {
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: data.priceCents ?? existing.priceCents,
        currency: "brl",
        recurring: {
          interval: (data.interval || existing.interval) === "year" ? "year" : "month",
        },
      });

      // Desativa o preço antigo no Stripe
      if (stripePriceId && stripePriceId !== newPrice.id) {
        try {
          await stripe.prices.update(stripePriceId, { active: false });
        } catch (err) {
          console.warn("Não foi possível arquivar preço anterior da Stripe:", err);
        }
      }

      stripePriceId = newPrice.id;
    }

    // 3. Atualiza no banco
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
        stripeProductId,
        stripePriceId,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Plano não encontrado", 404);
    }

    if (existing.stripeProductId) {
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
