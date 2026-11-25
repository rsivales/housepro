export const maxDuration = 120;
import { after } from "next/server";
import { validateBuyerProfile } from "@/lib/matching/profile";
import { runMatching } from "@/lib/matching/server";
import { visibleLeadRows } from "@/lib/db/lead-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { mapContact, listContactsByOwner } from "@/lib/db/repo";
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
    if (!lead || (lead.assigned_agent_id || lead.owner_id) !== session.agent.id) return NextResponse.json({error:"Só o responsável pode criar a ficha da lead."},{status:403});
  }
  try {
    const {data,error} = await createAdminClient().rpc("save_contact_identity",{p_actor:session.agent.id,p_data:{...body,...(body.buyerProfile ? {buyerProfile} : {})},p_lead:body.leadId || null});
    if(error) {
      if(error.code === "23505") return NextResponse.json({error:"Este telefone ou email já existe. Procure a ficha nos contactos."},{status:409});
      throw new Error("contact_save_failed");
    }
    if(data.conflict) return NextResponse.json({error:data.error},{status:409});
    const contact=mapContact(data.contact);
    if (data.exists && !body.leadId) return NextResponse.json({error:"Este contacto já existe. Abra a ficha existente.",existingContactId:contact.id},{status:409});
    after(async () => { await runMatching({ contactId: contact.id }); });
    return NextResponse.json({contact,exists:data.exists,linked:data.linked});
  } catch { return NextResponse.json({error:"Não foi possível guardar o contacto. Não foi criada uma ficha parcial. Tente novamente."},{status:500}); }
}
