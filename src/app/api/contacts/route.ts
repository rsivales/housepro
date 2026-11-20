export const maxDuration = 120;
import { after } from "next/server";
import { validateBuyerProfile } from "@/lib/matching/profile";
import { runMatching } from "@/lib/matching/server";
import { visibleLeadRows } from "@/lib/db/lead-access";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createContact, listContactsByOwner } from "@/lib/db/repo";
import type { ContactType } from "@/lib/data/contacts";

/**
 * Contactos do consultor.
 *  GET  → contactos do próprio.
 *  POST → cria um contacto. Em demo devolve o objeto sem persistir.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const contacts = await listContactsByOwner(session.agent.id);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.viewingAs || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    buyerProfile?: unknown;
    leadId?: string;
    name?: string;
    phone?: string;
    email?: string;
    type?: ContactType;
    zone?: string;
    budget?: string;
    language?: string;
    source?: string;
    nif?: string;
    idDocument?: string;
    address?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.name) {
    return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
  }

  let buyerProfile;
  try { buyerProfile = validateBuyerProfile(body.buyerProfile ?? {}); } catch(e) { return NextResponse.json({error:e instanceof Error ? e.message : "Qualificação inválida."},{status:422}); }
  if (body.leadId) {
    const [lead] = await visibleLeadRows(session.agent, body.leadId);
    if (!lead || ![lead.owner_id,lead.assigned_agent_id].includes(session.agent.id)) return NextResponse.json({error:"Só o responsável pode qualificar a lead."},{status:403});
    if (lead.contact_id) return NextResponse.json({error:"Esta lead já tem ficha de contacto. Abra-a para qualificar."},{status:409});
  }
  try {
  const contact = await createContact({
    buyerProfile,
    name: String(body.name),
    phone: body.phone,
    email: body.email,
    type: body.type ?? "outro",
    ownerId: session.agent.id,
    agencyId: session.agent.agencyId || undefined,
    zone: body.zone,
    budget: body.budget,
    language: body.language,
    source: body.source ?? "manual",
    nif: body.nif,
    idDocument: body.idDocument,
    address: body.address,
  });
  if (contact.ownerId !== session.agent.id) return NextResponse.json({error:"Já existe uma ficha acompanhada por outro agente. Contacte-o para evitar duplicação."},{status:409});
  if (body.leadId) {
    const sb=await createClient();
    const {data,error}=await sb.from("leads").update({contact_id:contact.id}).eq("id",body.leadId).is("contact_id",null).select("id");
    if(error || !data?.length) return NextResponse.json({error:"Contacto guardado, mas não foi possível associar a lead. Abra a ficha nos Contactos."},{status:409});
  }
  after(async () => { await runMatching({ contactId: contact.id }); });
  return NextResponse.json({ contact, demo: session.demo });
  } catch { return NextResponse.json({error:"Não foi possível guardar o contacto. Tente novamente."},{status:500}); }
}
