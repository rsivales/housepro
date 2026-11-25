import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

const OCCASIONS = ["natal", "pascoa", "carnaval", "abril_25", "halloween", "santos_populares", "dia_mae", "dia_pai", "aniversario"];
const AUDIENCES = ["clientes", "consultores", "brokers"];

async function access() {
  const session = await getSession();
  if (!session || session.demo || !isNetworkFinanceAdmin(session.agent)) return null;
  return session;
}

/** Mensagens institucionais sazonais/aniversário, por ocasião x público. */
export async function GET() {
  const session = await access();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });
  const { data } = await createAdminClient().from("institutional_messages").select("occasion_key,audience,subject,body,image_url,enabled,updated_at");
  const byKey = new Map((data ?? []).map((r) => [`${r.occasion_key}:${r.audience}`, r]));
  const rows = OCCASIONS.flatMap((occasion) =>
    AUDIENCES.map((audience) => {
      const existing = byKey.get(`${occasion}:${audience}`);
      return existing ?? { occasion_key: occasion, audience, subject: "", body: "", image_url: null, enabled: false, updated_at: null };
    }),
  );
  return NextResponse.json({ rows });
}

export async function PUT(request: Request) {
  const session = await access();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });
  const b = await request.json().catch(() => null);
  if (!OCCASIONS.includes(b?.occasionKey) || !AUDIENCES.includes(b?.audience))
    return NextResponse.json({ error: "Ocasião ou público inválido." }, { status: 400 });
  const subject = String(b.subject ?? "").trim();
  const body = String(b.body ?? "").trim();
  const imageUrl = typeof b.imageUrl === "string" && /^https:\/\//.test(b.imageUrl) ? b.imageUrl : null;
  if (b.enabled && (!subject || !body))
    return NextResponse.json({ error: "Preencha assunto e mensagem antes de ativar." }, { status: 422 });
  const { error } = await createAdminClient().from("institutional_messages").upsert(
    {
      occasion_key: b.occasionKey,
      audience: b.audience,
      subject,
      body,
      image_url: imageUrl,
      enabled: Boolean(b.enabled),
      updated_by: session.agent.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "occasion_key,audience" },
  );
  if (error) return NextResponse.json({ error: "Não foi possível guardar." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
