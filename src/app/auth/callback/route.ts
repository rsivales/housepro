import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Troca o código do magic link por uma sessão. Encaminha conforme o tipo de
 * utilizador: profissional (tem perfil) → /app; comprador (sem perfil) →
 * /cliente/favoritos. Um `next` explícito é sempre respeitado.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  let dest = explicitNext ?? "/app";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Sem `next` explícito, decide pelo tipo de conta.
    if (!explicitNext) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
          dest = profile ? "/app" : "/cliente/favoritos";
        }
      } catch {
        /* mantém o destino por defeito */
      }
    }
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
