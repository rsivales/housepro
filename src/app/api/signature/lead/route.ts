import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { notifyLead } from "@/lib/notify";

const sources = new Set(["Signature — Pesquisa privada", "Signature — Construção por medida", "Signature — Candidatura de imóvel", "Signature — Imóvel"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim(), email = String(body?.email ?? "").trim();
  const subSource = String(body?.subSource ?? "");
  if (!name || !email || !sources.has(subSource) || !body?.consent) return NextResponse.json({ error: "Dados obrigatórios ou consentimento em falta." }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const admin = createAdminClient();
  const propertyId = body?.propertyId ? String(body.propertyId) : null;
  const { data: property } = propertyId ? await admin.from("properties").select("id, reference, agent_id, title").eq("id", propertyId).maybeSingle() : { data: null };
  const { data: fallback } = await admin.from("profiles").select("id, name, email").in("role_key", ["superadmin", "admin", "diretor"]).eq("active", true).limit(1).maybeSingle();
  const ownerId = property?.agent_id ?? fallback?.id;
  if (!ownerId) return NextResponse.json({ error: "Não foi possível atribuir o pedido." }, { status: 503 });
  const note = [body?.phone ? `Telefone: ${String(body.phone)}` : null, body?.details ? `Pedido: ${String(body.details)}` : null, body?.utm ? `UTM: ${JSON.stringify(body.utm)}` : null].filter(Boolean).join("\n");
  const { data: lead, error } = await admin.from("leads").insert({ property_id: property?.id ?? null, owner_id: ownerId, name, contact: email, message: note || null, source: "site", sub_source: subSource, contact_preference: body?.contactPreference ?? null, marketing_consent: Boolean(body?.marketingConsent), page_url: body?.pageUrl ? String(body.pageUrl) : null, utm: body?.utm && typeof body.utm === "object" ? body.utm : null }).select("id, created_at").single();
  if (error) return NextResponse.json({ error: "Não foi possível guardar o pedido." }, { status: 500 });
  void notifyLead({ id: String(lead.id), ownerId, name, contact: email, email, intent: "mensagem", source: "site", status: "novo", createdAt: String(lead.created_at), message: note }, { agentName: fallback?.name, agentEmail: fallback?.email, propertyRef: property?.reference, channel: "Signature" });
  return NextResponse.json({ ok: true, id: lead.id });
}
