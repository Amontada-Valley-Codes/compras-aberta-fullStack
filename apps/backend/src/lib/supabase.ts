import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

// Usamos placeholders para evitar que o servidor "crashe" ao iniciar caso o usuário não tenha configurado o .env ainda.
const supabaseUrl = env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_key";

if (supabaseUrl === "https://placeholder.supabase.co") {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.");
}

export const SUPABASE_STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
export const supabase = createClient(supabaseUrl, supabaseKey);
