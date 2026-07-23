import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Aprovação de publicação de imóvel pela administração/coordenação.
 * PATCH { id, action: "approve" | "reject", reason?, by? }
 * Grava no Supabase quando configurado; caso contrário devolve o novo estado
 * (modo demo) para o fluxo ser testável.
 */
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  const approval = action === "approve" ? "aprovado" : "rejeitado";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase
        .from("properties")
        .update({
          approval,
          approved_by: body.by ? String(body.by) : null,
          rejection_reason: action === "reject" && body.reason ? String(body.reason) : null,
        })
        .eq("id", id);
    } catch {
      /* best-effort no protótipo */
    }
  }

  return NextResponse.json({ ok: true, id, approval });
}
