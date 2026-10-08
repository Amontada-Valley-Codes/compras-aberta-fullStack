"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = routes;
const access_request_routes_1 = require("./modules/access-requests/access-request.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const cnpj_routes_1 = require("./modules/cnpj/cnpj.routes");
const municipio_routes_1 = require("./modules/municipios/municipio.routes");
const session_routes_1 = require("./modules/sessions/session.routes");
// O cadastro de usuário BUSINESS acontece só por POST /access-requests, que
// cria a conta já vinculada a uma solicitação pendente de aprovação.
async function routes(app) {
    await app.register(access_request_routes_1.accessRequestRoutes);
    await app.register(session_routes_1.sessionRoutes);
    await app.register(municipio_routes_1.municipioRoutes);
    await app.register(cnpj_routes_1.cnpjRoutes);
    await app.register(analytics_routes_1.analyticsRoutes);
}
