import { cookies } from "next/headers";

import { isSupabaseConfigured } from "./env";
import { createClient } from "./server";
import { agentById } from "@/lib/data/mock";
import { VIEW_AS_COOKIE, PROD_VIEW_AS_COOKIE, isSuperadmin } from "@/lib/data/roles";
import type { Agent } from "@/lib/data/types";

export interface Session {
  agent: Agent;
  /** True when Supabase Auth is not configured — a sample consultant is shown. */
  demo: boolean;
  /**
   * A identidade REAL autenticada — só definida quando difere de `agent`,
   * ou seja, quando um Super Admin está a "ver como" outro papel real
   * (navegação/inspeção). `agent` passa a refletir o papel simulado em toda
   * a app (gates de página, APIs); usa `realAgent` só para o próprio
   * controlo de "ver como" (para continuar a funcionar mesmo a simular um
   * papel sem acesso a essas áreas).
   */
  realAgent?: Agent;
  viewingAs?: boolean;
}

function mapProfile(id: string, profile: {
  name?: string | null; role?: string | null; role_key?: string | null; own_ami?: boolean | null;
  agency?: string | null; agency_id?: string | null; whatsapp?: string | null; photo_url?: string | null; accent?: string | null;
} | null, fallbackName: string): Agent {
  return {
    id,
    name: profile?.name ?? fallbackName,
    role: profile?.role ?? "agente",
    roleKey: (profile?.role_key as Agent["roleKey"]) ?? undefined,
    ownAMI: profile?.own_ami ?? undefined,
    agency: profile?.agency ?? "",
    agencyId: profile?.agency_id ?? "",
    whatsapp: profile?.whatsapp ?? "",
    accent: profile?.accent ?? "var(--brand)",
    photo: profile?.photo_url ?? undefined,
  };
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

  const realAgent = mapProfile(user.id, profile, user.email ?? "Consultor");

  // "Ver como" em produção — só tem efeito depois de confirmar que a
  // identidade REAL é Super Admin (nunca escala privilégios, só estreita a
  // vista de quem já é a autoridade máxima, para inspecionar outros papéis).
  if (isSuperadmin(realAgent)) {
    try {
      const jar = await cookies();
      const viewAsId = jar.get(PROD_VIEW_AS_COOKIE)?.value;
      if (viewAsId && viewAsId !== user.id) {
        const { data: viewProfile } = await supabase
          .from("profiles")
          .select("name, role, role_key, own_ami, agency, agency_id, whatsapp, photo_url, accent")
          .eq("id", viewAsId)
          .maybeSingle();
        if (viewProfile) {
          const viewedAgent = mapProfile(viewAsId, viewProfile, "Consultor");
          return { agent: viewedAgent, demo: false, realAgent, viewingAs: true };
        }
      }
    } catch {
      /* fora de contexto de pedido */
    }
  }

  return { agent: realAgent, demo: false };
}
