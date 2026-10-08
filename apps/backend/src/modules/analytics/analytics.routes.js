"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = analyticsRoutes;
const analytics_controller_1 = require("./analytics.controller");
const analytics_docs_1 = require("./analytics.docs");
async function analyticsRoutes(app) {
    app.get("/analytics/licitacoes-detalhadas", { schema: analytics_docs_1.listDetailedBidsDocs }, analytics_controller_1.analyticsController.listDetailedBids);
    app.get("/analytics/participacoes-me-locais", { schema: analytics_docs_1.listLocalMicroenterpriseParticipationsDocs }, analytics_controller_1.analyticsController.listLocalMicroenterpriseParticipations);
    app.get("/analytics/participacoes-me-gerais", { schema: analytics_docs_1.listGeneralMicroenterpriseParticipationsDocs }, analytics_controller_1.analyticsController.listGeneralMicroenterpriseParticipations);
    app.get("/analytics/gastos-por-natureza", { schema: analytics_docs_1.listExpensesByNatureDocs }, analytics_controller_1.analyticsController.listExpensesByNature);
    app.get("/analytics/microempresas", { schema: analytics_docs_1.getMicroenterpriseIndicatorDocs }, analytics_controller_1.analyticsController.getMicroenterpriseIndicator);
    app.get("/analytics/participacao-me-por-natureza", { schema: analytics_docs_1.listMicroenterpriseParticipationByNatureDocs }, analytics_controller_1.analyticsController.listMicroenterpriseParticipationByNature);
}
