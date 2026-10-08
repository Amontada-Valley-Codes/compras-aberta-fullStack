import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Usamos placeholders para evitar que o servidor "crashe" ao iniciar caso o usuário não tenha configurado o .env ainda.
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_key";

if (supabaseUrl === "https://placeholder.supabase.co") {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
