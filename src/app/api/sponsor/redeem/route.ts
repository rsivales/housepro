import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Resgata um código de padrinhado: liga o consultor autenticado (apadrinhado)
 * ao padrinho que gerou o convite, preenchendo o seu sponsor_id.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Indique o código." }, { status: 400 });

  if (!isSupabaseConfigured() || session.demo) {
    // Protótipo: aceita o código e devolve OK para o fluxo ser testável.
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("sponsorship_invites")
    .select("id, sponsor_id, used_by")
    .eq("code", code)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Código inválido." }, { status: 404 });
  if (invite.used_by) return NextResponse.json({ error: "Este código já foi usado." }, { status: 409 });
  if (String(invite.sponsor_id) === session.agent.id) {
    return NextResponse.json({ error: "Não pode apadrinhar-se a si próprio." }, { status: 400 });
  }

  // Liga o apadrinhado ao padrinho.
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ sponsor_id: invite.sponsor_id })
    .eq("id", session.agent.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  await supabase
    .from("sponsorship_invites")
    .update({ used_by: session.agent.id, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Nome do padrinho (para confirmação).
  const { data: sponsor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", invite.sponsor_id)
    .maybeSingle();

  return NextResponse.json({ ok: true, sponsorName: sponsor?.name ?? null });
}
