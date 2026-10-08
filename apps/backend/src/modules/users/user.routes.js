"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const ensure_authenticated_1 = require("../../middlewares/ensure-authenticated");
const user_controller_1 = require("./user.controller");
async function userRoutes(app) {
    app.get("/me", {
        onRequest: [ensure_authenticated_1.ensureAuthenticated],
    }, user_controller_1.userController.me);
}
