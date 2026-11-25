import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapContact } from "@/lib/db/repo";
import type { Contact, ContactType } from "@/lib/data/contacts";

export const maxDuration = 120;

interface ImportRowBody {
  name?: string;
  phone?: string;
  email?: string;
  type?: ContactType;
  zone?: string;
  budget?: string;
}

const MAX_ROWS = 500;

/**
 * Importação em massa de contactos (CSV/Excel) — reutiliza a mesma RPC
 * atómica usada na criação individual (dedupe por telefone/email), uma linha
 * de cada vez. Devolve um resumo (criados/ligados/duplicados/erros) em vez de
 * falhar tudo por causa de uma linha má.
 *  POST { rows: ImportRowBody[] }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.viewingAs || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { rows?: ImportRowBody[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "Sem linhas para importar." }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Máximo de ${MAX_ROWS} linhas por importação.` }, { status: 422 });

  const admin = createAdminClient();
  const created: Contact[] = [];
  let duplicates = 0;
  let failed = 0;

  for (const row of rows) {
    const name = (row.name ?? "").trim();
    if (!name) { failed++; continue; }
    try {
      const { data, error } = await admin.rpc("save_contact_identity", {
        p_actor: session.agent.id,
        p_data: { name, phone: row.phone, email: row.email, type: row.type, zone: row.zone, budget: row.budget, source: "importacao" },
        p_lead: null,
      });
      if (error || data?.conflict) { duplicates++; continue; }
      const contact = mapContact(data.contact);
      if (data.exists) duplicates++;
      else created.push(contact);
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ created, duplicates, failed, total: rows.length });
}
