import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dealTeamOrStaffAllowed } from "@/lib/db/deal-permissions";
import { getDealGate } from "@/lib/db/deals";
import { notifyGeneric } from "@/lib/notify";
import type { CreditStage } from "@/lib/data/deal";

const CREDIT_LABEL: Record<CreditStage, string> = {
  sem_credito: "Sem crédito registado",
  pedido: "Pedido de crédito",
  aprovacao: "Crédito em aprovação",
  avaliacao: "Avaliação em curso",
  escritura_marcada: "Escritura marcada",
};

/**
 * Notifica o comprador (e, em cópia, o consultor) sobre o estado atual do
 * crédito do negócio. Best-effort — nunca envia sem um email de destino
 * válido.
 *  POST { dealId }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { dealId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dealId = String(body.dealId ?? "").trim();
  if (!dealId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const gate = await getDealGate(dealId);
  if (!gate) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!dealTeamOrStaffAllowed(session.agent, gate)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("deals")
    .select("credit_stage, buyer_name, property:properties!property_id(reference), buyer_contact:contacts!buyer_contact_id(name,email)")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const contact = (Array.isArray(deal.buyer_contact) ? deal.buyer_contact[0] : deal.buyer_contact) as { name?: string; email?: string } | null;
  const email = contact?.email;
  if (!email) return NextResponse.json({ error: "Este negócio não tem email do comprador associado." }, { status: 422 });

  const property = (Array.isArray(deal.property) ? deal.property[0] : deal.property) as { reference?: string } | null;
  const creditStage = (deal.credit_stage as CreditStage) ?? "sem_credito";
  const nome = contact?.name || deal.buyer_name || "Cliente";

  const text = [
    `Olá ${nome},`,
    "",
    `Atualização sobre o processo de crédito do seu imóvel${property?.reference ? ` (ref. ${property.reference})` : ""}:`,
    "",
    `Estado atual: ${CREDIT_LABEL[creditStage]}`,
    "",
    `O seu consultor, ${session.agent.name}, está disponível para qualquer esclarecimento.`,
    "",
    "— HousePro",
  ].join("\n");

  const channels = await notifyGeneric({
    subject: `HousePro — estado do crédito: ${CREDIT_LABEL[creditStage]}`,
    text,
    to: [email],
    replyTo: session.agent.email,
  });
  if (channels.length === 0) return NextResponse.json({ error: "Não foi possível enviar — confirme a configuração de email." }, { status: 503 });

  return NextResponse.json({ ok: true, to: email });
}
