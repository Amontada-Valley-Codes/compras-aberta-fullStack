import type { FastifyInstance } from "fastify";

import { analyticsController } from "./analytics.controller";

async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    "/analytics/licitacoes-detalhadas",
    analyticsController.listDetailedBids,
  );
  app.get(
    "/analytics/participacoes-me-locais",
    analyticsController.listLocalMicroenterpriseParticipations,
  );
  app.get(
    "/analytics/gastos-por-natureza",
    analyticsController.listExpensesByNature,
  );
  app.get(
    "/analytics/microempresas",
    analyticsController.getMicroenterpriseIndicator,
  );
  app.get(
    "/analytics/participacao-me-por-natureza",
    analyticsController.listMicroenterpriseParticipationByNature,
  );
}

export { analyticsRoutes };
