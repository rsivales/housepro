import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { notifyGeneric } from "@/lib/notify";

/**
 * Gera um convite de padrinhado com código. O padrinho envia o código; ao usá-lo
 * no registo, o consultor apadrinhado fica ligado à árvore certa (sem falhas).
 */

function makeCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem chars ambíguos
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HP-${s.slice(0, 4)}-${s.slice(4)}`;
}

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
  const code = makeCode();

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
