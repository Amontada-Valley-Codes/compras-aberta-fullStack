"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cnpjRoutes = cnpjRoutes;
const cnpj_controller_1 = require("./cnpj.controller");
const cnpj_docs_1 = require("./cnpj.docs");
async function cnpjRoutes(app) {
    app.get("/cnpj/:cnpj", {
        schema: cnpj_docs_1.findCnpjDocs,
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    }, cnpj_controller_1.cnpjController.find);
}
