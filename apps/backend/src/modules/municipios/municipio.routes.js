"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.municipioRoutes = municipioRoutes;
const municipio_controller_1 = require("./municipio.controller");
const municipio_docs_1 = require("./municipio.docs");
async function municipioRoutes(app) {
    app.get("/municipios", { schema: municipio_docs_1.listMunicipiosDocs }, municipio_controller_1.municipioController.list);
}
