import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 ||
      body.ids.some((id: unknown) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: "Notificações inválidas." }, { status: 400 });
  }
  if (!session.demo) {
    const { error } = await createAdminClient().from("notifications")
      .update({ dismissed_at: new Date().toISOString(), read: true })
      .eq("user_id", session.agent.id).in("id", body.ids);
    if (error) return NextResponse.json({ error: "Não foi possível remover." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
