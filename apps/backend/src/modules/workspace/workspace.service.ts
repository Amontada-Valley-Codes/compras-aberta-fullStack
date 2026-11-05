import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  CreateReminderInput,
  UpdateReminderInput,
  UpsertTrackedBidInput,
} from "./workspace.schema";

function parseSafeDate(raw: string): Date {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Data inválida informada para o lembrete.", 400);
  }
  return parsed;
}

const workspaceService = {
  async getWorkspace(userId: string) {
    const [trackedBids, reminders] = await Promise.all([
      prisma.trackedBid.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.agendaReminder.findMany({
        where: { userId },
        orderBy: { dueAt: "asc" },
      }),
    ]);

    return {
      trackedBids,
      reminders,
    };
  },

  async upsertTrackedBid(userId: string, input: UpsertTrackedBidInput) {
    const existing = await prisma.trackedBid.findUnique({
      where: {
        userId_bidControlId: {
          userId,
          bidControlId: input.bidControlId,
        },
      },
    });

    const existingMeta =
      existing &&
      typeof existing.metadata === "object" &&
      existing.metadata !== null &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const mergedMetadata = input.metadata
      ? { ...existingMeta, ...input.metadata }
      : existingMeta;

    const existingSnapshot =
      existing &&
      typeof existing.bidSnapshot === "object" &&
      existing.bidSnapshot !== null &&
      !Array.isArray(existing.bidSnapshot)
        ? (existing.bidSnapshot as Record<string, unknown>)
        : { id: input.bidControlId };

    const mergedSnapshot = input.bidSnapshot
      ? { ...existingSnapshot, ...input.bidSnapshot }
      : existingSnapshot;

    return prisma.$transaction(async (tx) => {
      const saved = await tx.trackedBid.upsert({
        where: {
          userId_bidControlId: {
            userId,
            bidControlId: input.bidControlId,
          },
        },
        create: {
          userId,
          bidControlId: input.bidControlId,
          stage: input.stage ?? "analise",
          nickname: input.nickname ?? null,
          customStatus: input.customStatus ?? null,
          tags: (input.tags ?? []) as object,
          notes: input.notes ?? "",
          bidSnapshot: mergedSnapshot as object,
          metadata: mergedMetadata as object,
          items: (input.items ?? []) as object,
        },
        update: {
          ...(input.stage !== undefined ? { stage: input.stage } : {}),
          ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
          ...(input.customStatus !== undefined
            ? { customStatus: input.customStatus }
            : {}),
          ...(input.tags !== undefined ? { tags: input.tags as object } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.bidSnapshot !== undefined
            ? { bidSnapshot: mergedSnapshot as object }
            : {}),
          ...(input.metadata !== undefined
            ? { metadata: mergedMetadata as object }
            : {}),
          ...(input.items !== undefined
            ? { items: input.items as object }
            : {}),
        },
      });

      await tx.radarBidState.upsert({
        where: {
          userId_bidControlId: {
            userId,
            bidControlId: input.bidControlId,
          },
        },
        create: {
          userId,
          bidControlId: input.bidControlId,
          isSaved: true,
          isHidden: false,
        },
        update: {
          isSaved: true,
        },
      });

      return saved;
    });
  },

  async deleteTrackedBid(userId: string, bidControlId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.trackedBid.findUnique({
        where: {
          userId_bidControlId: { userId, bidControlId },
        },
      });

      if (existing) {
        await tx.trackedBid.delete({
          where: { id: existing.id },
        });
      }

      const radarState = await tx.radarBidState.findUnique({
        where: {
          userId_bidControlId: { userId, bidControlId },
        },
      });

      if (radarState) {
        if (radarState.isHidden) {
          await tx.radarBidState.update({
            where: { id: radarState.id },
            data: { isSaved: false },
          });
        } else {
          await tx.radarBidState.delete({
            where: { id: radarState.id },
          });
        }
      }

      return { bidControlId, deleted: true };
    });
  },

  async createReminder(userId: string, input: CreateReminderInput) {
    const count = await prisma.agendaReminder.count({ where: { userId } });
    if (count >= 500) {
      throw new AppError("Limite máximo de lembretes atingido.", 400);
    }

    let validTrackedBidId: string | null = null;
    if (input.trackedBidId) {
      const owned = await prisma.trackedBid.findFirst({
        where: { id: input.trackedBidId, userId },
        select: { id: true },
      });
      if (owned) validTrackedBidId = owned.id;
    }

    return prisma.agendaReminder.create({
      data: {
        userId,
        trackedBidId: validTrackedBidId,
        title: input.title,
        description: input.description ?? null,
        dueAt: parseSafeDate(input.dueAt),
        type: input.type ?? "lembrete",
        completed: input.completed ?? false,
      },
    });
  },

  async updateReminder(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput,
  ) {
    const existing = await prisma.agendaReminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!existing) {
      throw new AppError("Lembrete não encontrado.", 404);
    }

    return prisma.agendaReminder.update({
      where: { id: reminderId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.dueAt !== undefined
          ? { dueAt: parseSafeDate(input.dueAt) }
          : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.completed !== undefined
          ? { completed: input.completed }
          : {}),
      },
    });
  },

  async deleteReminder(userId: string, reminderId: string) {
    const existing = await prisma.agendaReminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!existing) {
      throw new AppError("Lembrete não encontrado.", 404);
    }

    await prisma.agendaReminder.delete({
      where: { id: reminderId },
    });

    return { id: reminderId, deleted: true };
  },
};

export { workspaceService };
