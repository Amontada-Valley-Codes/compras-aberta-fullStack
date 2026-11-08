import type { FastifyInstance } from "fastify";

import { analyticsController } from "./analytics.controller";
import {
  paymentsSummaryDocs,
  paymentSuppliersDocs,
  getMicroenterpriseIndicatorDocs,
  listDetailedBidsDocs,
  listExpensesByNatureDocs,
  listGeneralMicroenterpriseParticipationsDocs,
  listLocalMicroenterpriseParticipationsDocs,
  listMicroenterpriseParticipationByNatureDocs,
} from "./analytics.docs";

async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/pagamentos/resumo", { schema: paymentsSummaryDocs }, analyticsController.getPaymentsSummary);
  app.get("/analytics/pagamentos/fornecedores", { schema: paymentSuppliersDocs }, analyticsController.listPaymentSuppliers);
  app.get(
    "/analytics/licitacoes-detalhadas",
    { schema: listDetailedBidsDocs },
    analyticsController.listDetailedBids,
  );
  app.get(
    "/analytics/participacoes-me-locais",
    { schema: listLocalMicroenterpriseParticipationsDocs },
    analyticsController.listLocalMicroenterpriseParticipations,
  );
  app.get(
    "/analytics/participacoes-me-gerais",
    { schema: listGeneralMicroenterpriseParticipationsDocs },
    analyticsController.listGeneralMicroenterpriseParticipations,
  );
  app.get(
    "/analytics/gastos-por-natureza",
    { schema: listExpensesByNatureDocs },
    analyticsController.listExpensesByNature,
  );
  app.get(
    "/analytics/microempresas",
    { schema: getMicroenterpriseIndicatorDocs },
    analyticsController.getMicroenterpriseIndicator,
  );
  app.get(
    "/analytics/participacao-me-por-natureza",
    { schema: listMicroenterpriseParticipationByNatureDocs },
    analyticsController.listMicroenterpriseParticipationByNature,
  );
}

export { analyticsRoutes };
