"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const fastify_1 = __importDefault(require("fastify"));
const openapi_1 = require("./docs/openapi");
const env_1 = require("./env");
const error_handling_1 = require("./middlewares/error-handling");
const routes_1 = require("./routes");
exports.app = (0, fastify_1.default)({ trustProxy: env_1.env.TRUST_PROXY });
exports.app.setValidatorCompiler(() => () => true);
exports.app.setSerializerCompiler(() => (data) => JSON.stringify(data));
exports.app.setErrorHandler(error_handling_1.errorHandling);
exports.app.register(cors_1.default, { origin: env_1.env.CORS_ORIGIN });
exports.app.register(rate_limit_1.default, {
    global: false,
    errorResponseBuilder: (_request, context) => ({
        statusCode: context.statusCode,
        message: `Muitas requisições. Tente novamente em ${context.after}.`,
    }),
});
exports.app.register(swagger_1.default, openapi_1.swaggerOptions);
exports.app.register(swagger_ui_1.default, openapi_1.swaggerUiOptions);
exports.app.register(routes_1.routes);
