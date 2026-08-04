import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Gestão de um afilhado: desativar/reativar (mantém posição e histórico) ou
 * remover da árvore (destaca; os filhos sobem para o padrinho — compressão).
 *
 * POST { memberId, action: "deactivate" | "reactivate" | "remove" }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: { memberId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const memberId = String(body.memberId ?? "");
  const action = String(body.action ?? "");
  if (!memberId || !["deactivate", "reactivate", "remove"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  if (!isSupabaseConfigured() || session.demo) {
    return NextResponse.json({ ok: true, demo: true });
  }

  try {
    const supabase = await createClient();

    if (action === "deactivate" || action === "reactivate") {
      const { error } = await supabase
        .from("profiles")
        .update({ network_active: action === "reactivate" })
        .eq("id", memberId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // remove: compressão — os filhos sobem para o padrinho do removido.
    const { data: member } = await supabase
      .from("profiles")
      .select("sponsor_id")
      .eq("id", memberId)
      .maybeSingle();
    const grandsponsor = member?.sponsor_id ?? null;

    await supabase.from("profiles").update({ sponsor_id: grandsponsor }).eq("sponsor_id", memberId);
    await supabase
      .from("profiles")
      .update({ sponsor_id: null, network_active: false })
      .eq("id", memberId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
