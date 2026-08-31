import { cookies } from "next/headers";

import { isSupabaseConfigured } from "./env";
import { createClient } from "./server";
import { agentById } from "@/lib/data/mock";
import { VIEW_AS_COOKIE } from "@/lib/data/roles";
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
    // Vista de supervisão: o Super Admin pode "ver como" qualquer papel.
    let viewAs = "rui";
    try {
      const jar = await cookies();
      const chosen = jar.get(VIEW_AS_COOKIE)?.value;
      if (chosen) viewAs = chosen;
    } catch {
      /* fora de contexto de request */
    }
    return { agent: agentById(viewAs), demo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, role_key, own_ami, agency, agency_id, whatsapp, photo_url, accent")
    .eq("id", user.id)
    .single();

  // Sem perfil = não é profissional (ex.: comprador com conta de portal). A
  // área profissional (/app, /admin) não deve ficar acessível a estes users.
  if (!profile) return null;

  const agent: Agent = {
    id: user.id,
    name: profile?.name ?? user.email ?? "Consultor",
    role: profile?.role ?? "agente",
    roleKey: (profile?.role_key as Agent["roleKey"]) ?? undefined,
    ownAMI: profile?.own_ami ?? undefined,
    agency: profile?.agency ?? "",
    agencyId: profile?.agency_id ?? "",
    whatsapp: profile?.whatsapp ?? "",
    accent: profile?.accent ?? "var(--brand)",
    photo: profile?.photo_url ?? undefined,
  };

  return { agent, demo: false };
}
