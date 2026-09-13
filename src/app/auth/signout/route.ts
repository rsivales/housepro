import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Termina a sessão. As mutações de cookies (limpar o token) têm de ser
 * escritas DIRETAMENTE na resposta devolvida — se forem feitas através do
 * cookie store do pedido (next/headers) e só depois se construir um
 * NextResponse.redirect() à parte, o browser pode nunca receber o Set-Cookie
 * que limpa a sessão, ficando "preso" na conta anterior mesmo depois de sair
 * (ecrã em branco / login automático no user antigo).
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/entrar", request.url), { status: 303 });

  if (isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Escreve sempre na resposta que vai mesmo ser devolvida.
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.signOut({ scope: "global" });
  }

  return response;
}
