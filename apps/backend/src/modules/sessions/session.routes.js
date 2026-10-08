"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRoutes = sessionRoutes;
const session_controller_1 = require("./session.controller");
const session_docs_1 = require("./session.docs");
async function sessionRoutes(app) {
    app.post("/sessions", {
        schema: session_docs_1.createSessionDocs,
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    }, session_controller_1.sessionController.create);
    app.post("/sessions/refresh", {
        schema: session_docs_1.refreshSessionDocs,
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    }, session_controller_1.sessionController.refresh);
    app.post("/sessions/logout", {
        schema: session_docs_1.logoutSessionDocs,
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    }, session_controller_1.sessionController.logout);
}
