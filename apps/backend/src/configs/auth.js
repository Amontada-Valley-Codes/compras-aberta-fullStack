"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = void 0;
const env_1 = require("../env");
const authConfig = {
    jwt: {
        secret: env_1.env.JWT_SECRET,
        expiresIn: "15m",
    },
    refreshToken: {
        expiresInDays: 7,
    },
};
exports.authConfig = authConfig;
