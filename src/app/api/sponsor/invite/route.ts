import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { notifyGeneric } from "@/lib/notify";
import { agentPrefixOf } from "@/lib/data/mock";
import { demoAfilhados } from "@/lib/data/afilhados";
import { affiliateCode } from "@/lib/codes";

/**
 * Gera um convite de padrinhado com CÓDIGO LEGÍVEL: prefixo do padrinho
 * (país+agência+agente) + A1G + posição do afilhado direto. Ex.: 1050012A1G3.
 * Ao usá-lo no registo, o consultor apadrinhado fica ligado à árvore certa.
 */

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const email = (body.email ?? "").trim() || undefined;

  // Posição MONOTÓNICA do próximo afilhado direto (1.ª geração): baseada nos
  // convites já emitidos (append-only), por isso NUNCA se reutiliza um número —
  // se um afilhado sair, o seguinte recebe o número seguinte, não o vago.
  let position = 1;
  const prefix = agentPrefixOf(session.agent.id);

  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      const { count: invites } = await supabase
        .from("sponsorship_invites")
        .select("id", { count: "exact", head: true })
        .eq("sponsor_id", session.agent.id);
      position = (invites ?? 0) + 1;
    } catch {
      /* best-effort */
    }
  } else {
    // Demo: conta os afilhados diretos na árvore de exemplo (raiz = rui).
    position = (demoAfilhados.id === session.agent.id ? demoAfilhados.children.length : 0) + 1;
  }

  const code = affiliateCode(prefix, 1, position);

  if (isSupabaseConfigured() && !session.demo) {
    try {
      const supabase = await createClient();
      await supabase.from("sponsorship_invites").insert({
        code,
        sponsor_id: session.agent.id,
        email: email ?? null,
      });
    } catch {
      /* best-effort no protótipo */
    }
  }

  const origin = new URL(request.url).origin;
  const link = `${origin}/entrar?padrinho=${encodeURIComponent(code)}`;

  // Email de convite (best-effort).
  if (email) {
    await notifyGeneric({
      subject: `${session.agent.name} convida-o para a HousePro`,
      to: [email],
      text:
        `Olá,\n\n${session.agent.name} apadrinha a sua entrada como consultor na HousePro.\n` +
        `Use este código ao criar a sua conta para ficar ligado à equipa:\n\n` +
        `   ${code}\n\n` +
        `Ou clique: ${link}\n\n— HousePro`,
    });
  }

  return NextResponse.json({ ok: true, code, link, emailed: Boolean(email) });
}
