import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  UpdateRadarBidStateInput,
  UpsertRadarFilterInput,
} from "./radar.schema";

const radarService = {
  async getRadarState(userId: string) {
    const [filters, bidStates] = await Promise.all([
      prisma.radarFilter.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.radarBidState.findMany({
        where: { userId },
      }),
    ]);

    const savedBidIds: string[] = [];
    const hiddenBidIds: string[] = [];

    for (const st of bidStates) {
      if (st.isSaved) savedBidIds.push(st.bidControlId);
      if (st.isHidden) hiddenBidIds.push(st.bidControlId);
    }

    return {
      filters,
      savedBidIds,
      hiddenBidIds,
    };
  },

  async createFilter(userId: string, input: UpsertRadarFilterInput) {
    const existingCount = await prisma.radarFilter.count({
      where: { userId },
    });

    if (existingCount >= 30) {
      throw new AppError("Limite máximo de 30 filtros salvos atingido.", 400);
    }

    const shouldBeDefault = input.isDefault || existingCount === 0;

    return prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.radarFilter.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.radarFilter.create({
        data: {
          userId,
          name: input.name,
          isDefault: shouldBeDefault,
          config: input.config as object,
        },
      });
    });
  },

  async updateFilter(
    userId: string,
    filterId: string,
    input: UpsertRadarFilterInput,
  ) {
    const existing = await prisma.radarFilter.findFirst({
      where: { id: filterId, userId },
    });

    if (!existing) {
      throw new AppError("Filtro não encontrado.", 404);
    }

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.radarFilter.updateMany({
          where: { userId, isDefault: true, id: { not: filterId } },
          data: { isDefault: false },
        });
      }

      return tx.radarFilter.update({
        where: { id: filterId },
        data: {
          name: input.name,
          isDefault: input.isDefault ?? existing.isDefault,
          config: input.config as object,
        },
      });
    });
  },

  async deleteFilter(userId: string, filterId: string) {
    const existing = await prisma.radarFilter.findFirst({
      where: { id: filterId, userId },
    });

    if (!existing) {
      throw new AppError("Filtro não encontrado.", 404);
    }

    await prisma.radarFilter.delete({
      where: { id: filterId },
    });

    return { id: filterId, deleted: true };
  },

  async upsertBidState(userId: string, input: UpdateRadarBidStateInput) {
    const current = await prisma.radarBidState.findUnique({
      where: {
        userId_bidControlId: {
          userId,
          bidControlId: input.bidControlId,
        },
      },
    });

    const nextSaved =
      input.isSaved !== undefined ? input.isSaved : (current?.isSaved ?? false);
    const nextHidden =
      input.isHidden !== undefined
        ? input.isHidden
        : (current?.isHidden ?? false);

    if (!nextSaved && !nextHidden) {
      if (current) {
        await prisma.radarBidState.delete({ where: { id: current.id } });
      }
      return {
        bidControlId: input.bidControlId,
        isSaved: false,
        isHidden: false,
      };
    }

    const updated = await prisma.radarBidState.upsert({
      where: {
        userId_bidControlId: {
          userId,
          bidControlId: input.bidControlId,
        },
      },
      create: {
        userId,
        bidControlId: input.bidControlId,
        isSaved: nextSaved,
        isHidden: nextHidden,
      },
      update: {
        isSaved: nextSaved,
        isHidden: nextHidden,
      },
    });

    return {
      bidControlId: updated.bidControlId,
      isSaved: updated.isSaved,
      isHidden: updated.isHidden,
    };
  },

  async syncSavedBids(userId: string, savedBidIds: string[]) {
    const uniqueIds = Array.from(new Set(savedBidIds));
    if (uniqueIds.length === 0) return { synced: 0 };

    await Promise.all(
      uniqueIds.map((bidControlId) =>
        prisma.radarBidState.upsert({
          where: {
            userId_bidControlId: { userId, bidControlId },
          },
          create: {
            userId,
            bidControlId,
            isSaved: true,
            isHidden: false,
          },
          update: {
            isSaved: true,
          },
        }),
      ),
    );

    return { synced: uniqueIds.length };
  },
};

export { radarService };
