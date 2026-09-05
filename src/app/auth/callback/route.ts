import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Conclui o magic link e encaminha conforme o tipo de conta: profissional (tem
 * perfil) → /app; comprador (sem perfil) → /cliente/favoritos. Aceita os dois
 * formatos de link do Supabase — PKCE (`?code=`) e OTP (`?token_hash=&type=`) —
 * e, se a sessão não for estabelecida, devolve à entrada com um aviso em vez de
 * seguir sem sessão.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const explicitNext = searchParams.get("next");
  const buyerFlow = explicitNext?.startsWith("/cliente") ?? false;

  const supabase = await createClient();
  let ok = false;
  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      ok = !error;
    }
  } catch {
    ok = false;
  }

  // Link inválido/expirado ou aberto noutro dispositivo → volta à entrada certa.
  if (!ok) {
    const back = buyerFlow ? "/cliente/entrar" : "/entrar";
    return NextResponse.redirect(`${origin}${back}?erro=link`);
  }

  let dest = explicitNext ?? "/app";
  if (!explicitNext) {
    // Sem destino explícito, decide pelo tipo de conta.
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

  return NextResponse.redirect(`${origin}${dest}`);
}
