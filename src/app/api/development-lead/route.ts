import { NextResponse } from "next/server";

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
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://housepro-chi.vercel.app"
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const kind = KINDS.includes(body?.kind as Kind) ? (body?.kind as Kind) : null;
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const projectId = String(body?.projectId ?? "").trim();
  const projectName = String(body?.projectName ?? "").trim();
  const userMessage = String(body?.message ?? "").trim();
  const operationalConsent = body?.operationalConsent === true;
  if (
    !kind ||
    !email ||
    !operationalConsent ||
    (["information", "brochure", "guide"].includes(kind) && !name)
  )
    return NextResponse.json(
      { error: "Preencha os campos obrigatórios e confirme o consentimento." },
      { status: 400 },
    );
  if (!hasServiceRole())
    return NextResponse.json(
      { error: "O serviço de pedidos não está disponível." },
      { status: 503 },
    );

  const sb = createAdminClient();
  const property = projectId
    ? (
        await sb
          .from("properties")
          .select("id, reference, title, agent_id, development_name")
          .eq("id", projectId)
          .maybeSingle()
      ).data
    : null;
  const itemName =
    projectName ||
    property?.development_name ||
    property?.title ||
    "Empreendimentos HousePro";
  const materialUrl =
    kind === "brochure"
      ? String(body?.brochureUrl ?? "").trim()
      : kind === "guide"
        ? publicUrl("/guias/comprar-em-planta")
        : "";
  if (kind === "brochure" && !/^https:\/\//i.test(materialUrl))
    return NextResponse.json(
      { error: "A brochura ainda não está disponível para envio." },
      { status: 409 },
    );

  const { data: routed, error: routeError } = await sb.rpc(
    "capture_development_lead",
    {
      payload: {
        kind,
        projectId: property?.id,
        name,
        email,
        phone,
        message: [SUBSOURCE[kind], `Projeto: ${itemName}`, userMessage || null]
          .filter(Boolean)
          .join("\n"),
        pageUrl: String(body?.pageUrl ?? "").slice(0, 500),
        operationalConsent,
        marketingConsent: body?.marketingConsent === true,
      },
    },
  );
  if (routeError || !routed?.id) {
    console.error("development_lead_routing_failed", {
      code: routeError?.code,
      message: routeError?.message,
    });
    return NextResponse.json(
      { error: "Não foi possível encaminhar o pedido. Tente novamente." },
      { status: 500 },
    );
  }
  const recipientIds = [routed.assignedAgentId, routed.brokerId].filter(
    Boolean,
  );
  const { data: recipients } = recipientIds.length
    ? await sb.from("profiles").select("id,name,email").in("id", recipientIds)
    : { data: [] };

  const adminChannels = await notifyGeneric({
    subject: `${SUBSOURCE[kind]} · ${itemName}`,
    text: [
      `Cliente: ${name || "Subscritor de alerta"}`,
      `Email: ${email}`,
      phone ? `Telefone: ${phone}` : null,
      `Lead Helix: ${routed.id}`,
      userMessage ? `Mensagem: ${userMessage}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    to: [
      ...(recipients ?? []).map((item) => item.email),
      process.env.LEAD_NOTIFY_EMAIL,
    ],
  });
  const clientChannels = materialUrl
    ? await notifyGeneric({
        subject:
          kind === "guide"
            ? "Guia HousePro · Comprar em planta"
            : `Brochura · ${itemName}`,
        text:
          kind === "guide"
            ? `Olá ${name},\n\nAqui está o seu guia HousePro: ${materialUrl}\n\nSe precisar de ajuda, responda a este email.`
            : `Olá ${name},\n\nAqui está a brochura autorizada de ${itemName}: ${materialUrl}\n\nUm consultor HousePro está disponível para esclarecer qualquer questão.`,
        to: [email],
      })
    : [];

  return NextResponse.json({
    ok: true,
    delivered: clientChannels.includes("email"),
    notified: adminChannels.length > 0,
  });
}
