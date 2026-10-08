"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessRoutes = businessRoutes;
const multipart_1 = __importDefault(require("@fastify/multipart"));
const business_controller_1 = require("./business.controller");
const business_docs_1 = require("./business.docs");
const upload_1 = require("../../utils/upload");
async function businessRoutes(app) {
    app.register(multipart_1.default, {
        limits: {
            fileSize: upload_1.MAX_FILE_SIZE,
            files: 4,
        },
    });
    app.post("/business/register", {
        schema: business_docs_1.registerBusinessDocs,
        config: {
            rateLimit: {
                max: 3,
                timeWindow: "10 minutes",
            },
        },
    }, business_controller_1.businessController.register);
}
