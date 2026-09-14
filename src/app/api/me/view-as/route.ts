import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSuperadmin } from "@/lib/data/roles";
import type { Agent } from "@/lib/data/types";

/**
 * Lista de perfis reais para o "Ver como" do Super Admin (produção). Avalia
 * sempre a identidade REAL autenticada (auth.uid()), nunca a vista
 * atualmente simulada — assim o próprio seletor continua a funcionar
 * enquanto se navega "como" outro papel sem acesso a rotas de administração.
 */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ profiles: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, role_key")
    .eq("id", user.id)
    .single();
  const meAsAgent = { role: me?.role, roleKey: me?.role_key } as Pick<Agent, "role" | "roleKey">;
  if (!me || !isSuperadmin(meAsAgent)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, name, role_key, agency")
    .order("name");

  return NextResponse.json({ profiles: data ?? [], selfId: user.id });
}
