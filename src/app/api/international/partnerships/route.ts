import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const b = await request.json().catch(() => null) as Record<string, unknown> | null;
  const required = ["partnerAgencyName", "country", "foreignBrokerName", "correspondentName", "correspondentEmail"];
  if (!b || required.some((k) => !String(b[k] ?? "").trim())) return NextResponse.json({ error: "Preencha os dados obrigatórios da parceria e do correspondente." }, { status: 400 });
  const sb = await createClient();
  const { data, error } = await sb.from("international_partnerships").insert({
    broker_id: session.agent.id, partner_agency_name: String(b.partnerAgencyName), partner_country: String(b.country),
    foreign_broker_name: String(b.foreignBrokerName), correspondent_name: String(b.correspondentName),
    correspondent_email: String(b.correspondentEmail), correspondent_phone: b.correspondentPhone ? String(b.correspondentPhone) : null,
    documents: Array.isArray(b.documents) ? b.documents : [], status: "pending",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
