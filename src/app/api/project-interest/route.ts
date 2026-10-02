import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { notifyGeneric } from "@/lib/notify";
import { createLead } from "@/lib/db/repo";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind === "international" || body?.kind === "development" ? body.kind : null;
  const id = String(body?.projectId ?? ""); const name = String(body?.name ?? "").trim(); const email = String(body?.email ?? "").trim();
  if (!kind || !id || !name || !email) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Serviço de encaminhamento indisponível." }, { status: 503 });
  const sb = createAdminClient();
  let recipientEmail: string | null = null; let recipientName = "responsável";
  if (kind === "international") {
    const { data: project } = await sb.from("international_projects").select("title, published, partnership_id").eq("id", id).maybeSingle();
    if (project) {
      if (!project.published) return NextResponse.json({ error: "Projeto indisponível." }, { status: 404 });
      const { data: partnership } = await sb.from("international_partnerships").select("status, correspondent_name, correspondent_email").eq("id", project.partnership_id).maybeSingle();
      if (partnership?.status !== "active" || !partnership.correspondent_email) return NextResponse.json({ error: "Parceria ainda não está disponível para contactos." }, { status: 409 });
      recipientEmail = partnership.correspondent_email; recipientName = partnership.correspondent_name || recipientName;
    } else {
      // Catálogo editorial existente (ex.: Dubai): segue para a equipa HousePro
      // até ser associado a uma parceria validada no backoffice.
      recipientEmail = process.env.LEAD_NOTIFY_EMAIL ?? null; recipientName = "equipa internacional HousePro";
    }
  } else {
    const { data: development } = await sb.from("developments").select("name, published, responsible_agent_id").eq("id", id).maybeSingle();
    if (development) {
      if (!development.published) return NextResponse.json({ error: "Empreendimento indisponível." }, { status: 404 });
      const { data: agent } = await sb.from("profiles").select("name, email").eq("id", development.responsible_agent_id).maybeSingle();
      recipientEmail = agent?.email ?? null; recipientName = agent?.name ?? recipientName;
    } else {
      recipientEmail = process.env.LEAD_NOTIFY_EMAIL ?? null; recipientName = "equipa de empreendimentos HousePro";
    }
  }
  if (!recipientEmail) return NextResponse.json({ error: "Não foi possível determinar o responsável." }, { status: 409 });
  const projectName = String(body?.projectName ?? "Projeto");
  const { data: fallbackOwner } = await sb.from("profiles").select("id").eq("role_key", "superadmin").limit(1).maybeSingle();
  const ownerId = kind === "development" && (await sb.from("properties").select("agent_id").eq("id", id).maybeSingle()).data?.agent_id || fallbackOwner?.id;
  if (ownerId) await createLead({
    ownerId: String(ownerId), name, contact: String(body?.phone ?? "").trim() || email, email,
    intent: "mensagem", source: "site", subSource: kind === "development" ? "Empreendimentos — Pedido de informação" : "Internacional — Pedido de informação",
    message: [`Projeto: ${projectName}`, body?.message ? String(body.message) : null].filter(Boolean).join("\n"),
  });
  const text = [`Novo pedido de informações — ${projectName}`, `Cliente: ${name}`, `Email: ${email}`, body?.phone ? `Telefone: ${String(body.phone)}` : null, body?.message ? `Mensagem: ${String(body.message)}` : null, `Encaminhado para: ${recipientName}`].filter(Boolean).join("\n");
  const channels = await notifyGeneric({ subject: `Pedido de informações · ${projectName}`, text, to: [recipientEmail] });
  return NextResponse.json({ ok: true, channels });
}
