import { NextResponse } from "next/server";

import { createLead } from "@/lib/db/repo";
import { notifyLead } from "@/lib/notify";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Webhook do Facebook / Instagram Lead Ads (Meta).
 *  - GET  → verificação do webhook (hub.challenge) com FB_VERIFY_TOKEN.
 *  - POST → recebe leadgen; obtém os dados (via FB_PAGE_TOKEN, na Graph API,
 *           ou diretamente no payload de teste), cria a lead e notifica.
 * Cada lead vira cartão no pipeline (createLead) + notificação (notifyLead).
 *
 * Pipeline: entra sempre em FB_LEADS_PIPELINE (por omissão "proprietarios",
 * porque a campanha Meta ligada aqui é de angariação de proprietários). Se
 * um dia houver também campanhas de compradores a apontar para este mesmo
 * webhook, isto terá de passar a distinguir por formulário/campanha.
 */
const LEADS_PIPELINE = process.env.FB_LEADS_PIPELINE || "proprietarios";

type FieldDatum = { name?: string; values?: string[] };
type FbBody = {
  entry?: {
    changes?: { value?: { field_data?: FieldDatum[]; leadgen_id?: string } }[];
  }[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.FB_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

async function fetchLeadDetails(leadgenId: string): Promise<FieldDatum[] | null> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { field_data?: FieldDatum[] };
    return data.field_data ?? null;
  } catch {
    return null;
  }
}

function pick(fields: FieldDatum[], keys: string[]): string | undefined {
  for (const k of keys) {
    const f = fields.find((x) => (x.name ?? "").toLowerCase().includes(k));
    if (f?.values?.length) return f.values[0];
  }
  return undefined;
}

export async function POST(request: Request) {
  let body: FbBody;
  try {
    body = (await request.json()) as FbBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const entries = body.entry ?? [];
  let processed = 0;

  // Sem responsável atribuído por formulário ainda — usa o fallback (staff
  // superadmin/admin/diretor) para a lead nunca ficar invisível a todos
  // (mesmo problema que já aconteceu com os pedidos de avaliação do /vender).
  let fallbackOwnerId = "";
  if (hasServiceRole()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("id")
        .in("role_key", ["superadmin", "admin", "diretor"])
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      fallbackOwnerId = data?.id ?? "";
    } catch {
      /* best-effort */
    }
  }

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      let fields: FieldDatum[] | null = v.field_data ?? null;
      if (!fields && v.leadgen_id) {
        fields = await fetchLeadDetails(String(v.leadgen_id));
      }
      if (!fields) continue;

      const name = pick(fields, ["full_name", "name", "nome"]) ?? "Lead do Facebook";
      const email = pick(fields, ["email"]);
      const phone = pick(fields, ["phone", "telefone", "telemovel"]);

      const lead = await createLead({
        ownerId: fallbackOwnerId,
        name,
        contact: phone || email || "(sem contacto)",
        email,
        intent: "mensagem",
        message: "Lead do Facebook / Instagram Lead Ads",
        source: "facebook",
        pipeline: LEADS_PIPELINE,
        qualification: "novo",
        unassigned: !fallbackOwnerId,
      });
      await notifyLead(lead, { channel: "Facebook Lead Ads" });
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed });
}
