"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./env");
const PORT = env_1.env.PORT;
app_1.app.listen({ port: PORT, }).then(() => {
    console.log("o servidor esta rodando ", PORT);
});
