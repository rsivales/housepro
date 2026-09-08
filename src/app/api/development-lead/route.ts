import { NextResponse } from "next/server";

import { createLead } from "@/lib/db/repo";
import { notifyGeneric } from "@/lib/notify";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

const KINDS = ["information", "brochure", "guide", "alert"] as const;
type Kind = (typeof KINDS)[number];

const SUBSOURCE: Record<Kind, string> = {
  information: "Empreendimentos — Pedido de informação",
  brochure: "Empreendimentos — Brochura",
  guide: "Empreendimentos — Guia comprador em planta",
  alert: "Empreendimentos — Alerta",
};

function publicUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://housepro-chi.vercel.app").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = KINDS.includes(body?.kind as Kind) ? body?.kind as Kind : null;
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const projectId = String(body?.projectId ?? "").trim();
  const projectName = String(body?.projectName ?? "").trim();
  const userMessage = String(body?.message ?? "").trim();
  if (!kind || !name || !email) return NextResponse.json({ error: "Indique o nome e email." }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "O serviço de pedidos não está disponível." }, { status: 503 });

  const sb = createAdminClient();
  const property = projectId
    ? (await sb.from("properties").select("id, reference, title, agent_id, development_name").eq("id", projectId).maybeSingle()).data
    : null;
  const { data: defaultOwner } = property?.agent_id
    ? { data: { id: property.agent_id, name: null, email: null } }
    : await sb.from("profiles").select("id, name, email").eq("role_key", "superadmin").limit(1).maybeSingle();
  if (!defaultOwner?.id) return NextResponse.json({ error: "Não foi possível encaminhar o pedido." }, { status: 409 });

  const itemName = projectName || property?.development_name || property?.title || "Empreendimentos HousePro";
  const materialUrl = kind === "brochure" ? String(body?.brochureUrl ?? "").trim() : kind === "guide" ? publicUrl("/guias/comprar-em-planta") : "";
  if (kind === "brochure" && !/^https:\/\//i.test(materialUrl)) return NextResponse.json({ error: "A brochura ainda não está disponível para envio." }, { status: 409 });

  const lead = await createLead({
    ownerId: String(defaultOwner.id),
    propertyId: property?.id ?? undefined,
    propertyRef: property?.reference ?? undefined,
    name,
    contact: phone || email,
    email,
    intent: "mensagem",
    message: [SUBSOURCE[kind], `Projeto: ${itemName}`, userMessage || null].filter(Boolean).join("\n"),
    source: "site",
    subSource: SUBSOURCE[kind],
    pageUrl: String(body?.pageUrl ?? "").slice(0, 500) || undefined,
    marketingConsent: body?.marketingConsent === true,
    emailStatus: materialUrl ? "pendente" : undefined,
  });

  const adminChannels = await notifyGeneric({
    subject: `${SUBSOURCE[kind]} · ${itemName}`,
    text: [`Cliente: ${name}`, `Email: ${email}`, phone ? `Telefone: ${phone}` : null, `Lead Helix: ${lead.id}`, userMessage ? `Mensagem: ${userMessage}` : null].filter(Boolean).join("\n"),
    to: [defaultOwner.email, process.env.LEAD_NOTIFY_EMAIL],
  });
  const clientChannels = materialUrl ? await notifyGeneric({
    subject: kind === "guide" ? "Guia HousePro · Comprar em planta" : `Brochura · ${itemName}`,
    text: kind === "guide"
      ? `Olá ${name},\n\nAqui está o seu guia HousePro: ${materialUrl}\n\nSe precisar de ajuda, responda a este email.`
      : `Olá ${name},\n\nAqui está a brochura autorizada de ${itemName}: ${materialUrl}\n\nUm consultor HousePro está disponível para esclarecer qualquer questão.`,
    to: [email],
  }) : [];

  return NextResponse.json({ ok: true, delivered: clientChannels.includes("email"), notified: adminChannels.length > 0 });
}
