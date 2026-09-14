import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Fila de pedidos de alteração de perfil (nome/foto/WhatsApp) pendentes de
 * aprovação — coordenação e acima. Usa service_role para ler o pedido +
 * o perfil atual (para mostrar o "antes/depois" na fila).
 */
async function requireStaff() {
  const session = await getSession();
  if (!session || session.demo || !isStaff(session.agent)) return null;
  return session;
}

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const admin = createAdminClient();
  const { data: requests, error } = await admin
    .from("profile_change_requests")
    .select("id, profile_id, name, photo_url, whatsapp, status, created_at")
    .eq("status", "pendente")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const profileIds = [...new Set((requests ?? []).map((r) => r.profile_id))];
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id, name, email, photo_url, whatsapp").in("id", profileIds)
    : { data: [] as { id: string; name: string; email: string | null; photo_url: string | null; whatsapp: string | null }[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const items = (requests ?? []).map((r) => ({
    id: r.id,
    profileId: r.profile_id,
    currentName: byId.get(r.profile_id)?.name ?? "—",
    currentEmail: byId.get(r.profile_id)?.email ?? "—",
    currentPhoto: byId.get(r.profile_id)?.photo_url ?? null,
    currentWhatsapp: byId.get(r.profile_id)?.whatsapp ?? null,
    proposedName: r.name,
    proposedPhoto: r.photo_url,
    proposedWhatsapp: r.whatsapp,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ ok: true, requests: items });
}
