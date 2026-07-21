import { isSupabaseConfigured } from "./env";
import { createClient } from "./server";
import { agentById } from "@/lib/data/mock";
import type { Agent } from "@/lib/data/types";

export interface Session {
  agent: Agent;
  /** True when Supabase Auth is not configured — a sample consultant is shown. */
  demo: boolean;
}

/**
 * Resolves the current consultant for the professional area.
 * - Supabase configured + authenticated → the real profile.
 * - Supabase configured + not authenticated → null (caller redirects to /entrar).
 * - Supabase NOT configured → a demo consultant, so the área profissional is
 *   viewable while Auth isn't wired to a project yet.
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return { agent: agentById("rui"), demo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, agency, agency_id, whatsapp, photo_url, accent")
    .eq("id", user.id)
    .single();

  const agent: Agent = {
    id: user.id,
    name: profile?.name ?? user.email ?? "Consultor",
    role: profile?.role ?? "agente",
    agency: profile?.agency ?? "",
    agencyId: profile?.agency_id ?? "",
    whatsapp: profile?.whatsapp ?? "",
    accent: profile?.accent ?? "var(--brand)",
    photo: profile?.photo_url ?? undefined,
  };

  return { agent, demo: false };
}
