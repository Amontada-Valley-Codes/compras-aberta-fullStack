"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
// Usamos placeholders para evitar que o servidor "crashe" ao iniciar caso o usuário não tenha configurado o .env ainda.
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_key";
if (supabaseUrl === "https://placeholder.supabase.co") {
    console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.");
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
