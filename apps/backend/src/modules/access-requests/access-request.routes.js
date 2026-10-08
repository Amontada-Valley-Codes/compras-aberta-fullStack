"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRequestRoutes = accessRequestRoutes;
const ensure_authenticated_1 = require("../../middlewares/ensure-authenticated");
const verify_user_authorization_1 = require("../../middlewares/verify-user-authorization");
const access_request_controller_1 = require("./access-request.controller");
const access_request_docs_1 = require("./access-request.docs");
async function accessRequestRoutes(app) {
    const adminOnly = [ensure_authenticated_1.ensureAuthenticated, (0, verify_user_authorization_1.verifyUserAuthorization)(["ADMIN"])];
    app.post("/access-requests", {
        schema: access_request_docs_1.createAccessRequestDocs,
        config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
    }, access_request_controller_1.accessRequestController.create);
    app.get("/access-requests/me", { schema: access_request_docs_1.findMyAccessRequestDocs, preHandler: [ensure_authenticated_1.ensureAuthenticated] }, access_request_controller_1.accessRequestController.findMine);
    app.get("/access-requests", { schema: access_request_docs_1.listAccessRequestsDocs, preHandler: adminOnly }, access_request_controller_1.accessRequestController.list);
    app.patch("/access-requests/:id/approve", { schema: access_request_docs_1.approveAccessRequestDocs, preHandler: adminOnly }, access_request_controller_1.accessRequestController.approve);
    app.patch("/access-requests/:id/reject", { schema: access_request_docs_1.rejectAccessRequestDocs, preHandler: adminOnly }, access_request_controller_1.accessRequestController.reject);
}
