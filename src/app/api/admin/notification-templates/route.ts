import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

const KEYS = ["deal_escritura_celebration"];

async function access() {
  const session = await getSession();
  if (!session || session.demo || !isNetworkFinanceAdmin(session.agent)) return null;
  return session;
}

/** Templates de notificação editáveis (hoje: a celebração da escritura). */
export async function GET() {
  const session = await access();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });
  const { data } = await createAdminClient().from("notification_templates").select("key,subject,body,updated_at");
  const byKey = new Map((data ?? []).map((r) => [r.key, r]));
  const rows = KEYS.map((key) => byKey.get(key) ?? { key, subject: "", body: "", updated_at: null });
  return NextResponse.json({ rows });
}

export async function PUT(request: Request) {
  const session = await access();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });
  const b = await request.json().catch(() => null);
  if (!KEYS.includes(b?.key)) return NextResponse.json({ error: "Template inválido." }, { status: 400 });
  const subject = String(b.subject ?? "").trim();
  const body = String(b.body ?? "").trim();
  if (!subject || !body) return NextResponse.json({ error: "Preencha assunto e mensagem." }, { status: 422 });
  const { error } = await createAdminClient().from("notification_templates").upsert(
    { key: b.key, subject, body, updated_by: session.agent.id, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) return NextResponse.json({ error: "Não foi possível guardar." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
