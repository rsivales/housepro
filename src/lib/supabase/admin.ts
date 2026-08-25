import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role (SÓ servidor). Ignora RLS — usar apenas em
 * rotas de administração já protegidas por papel. NUNCA importar no cliente.
 * Requer SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.
 */
export function hasServiceRole(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("service_role_not_configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
