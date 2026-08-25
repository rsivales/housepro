import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Gestão de consultores (SUPERADMIN/admin/coordenação). Usa o service_role
 * para criar utilizadores em Auth + perfil. Todas as ações verificam o papel
 * do requerente (sessão) antes de usar o service_role.
 */

/** Mapeia o papel preciso (role_key) para o enum user_role da BD. */
function toEnumRole(roleKey: string): "admin" | "coordenador" | "agente" {
  if (["superadmin", "admin", "diretor"].includes(roleKey)) return "admin";
  if (roleKey === "coordenador") return "coordenador";
  return "agente";
}

async function requireStaff() {
  const session = await getSession();
  if (!session || session.demo || !isStaff(session.agent)) return null;
  return session;
}

function tempPassword(): string {
  return "HP-" + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!";
}

/** GET — lista consultores + agências (para os seletores). */
export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const admin = createAdminClient();
  const [{ data: profiles }, { data: agencies }] = await Promise.all([
    admin.from("profiles").select("id, name, email, role, role_key, agency_id, whatsapp, active").order("name"),
    admin.from("agencies").select("id, name, region").order("name"),
  ]);
  return NextResponse.json({ ok: true, consultores: profiles ?? [], agencies: agencies ?? [] });
}

/** POST — cria um consultor (Auth user + perfil). Devolve uma password temporária. */
export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const name = String(b.name ?? "").trim();
  const roleKey = String(b.roleKey ?? "agente");
  const agencyId = b.agencyId ? String(b.agencyId) : null;
  const whatsapp = b.whatsapp ? String(b.whatsapp) : null;
  if (!email || !name) return NextResponse.json({ error: "missing_fields" }, { status: 422 });

  const admin = createAdminClient();
  const pass = tempPassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: pass, email_confirm: true, user_metadata: { name },
  });
  if (error || !created?.user) {
    return NextResponse.json({ error: error?.message ?? "create_failed" }, { status: 400 });
  }
  const { error: pErr } = await admin.from("profiles").upsert({
    id: created.user.id, name, email, role: toEnumRole(roleKey), role_key: roleKey,
    agency_id: agencyId, whatsapp, active: true,
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: created.user.id, tempPassword: pass });
}

/** PATCH — edita um consultor (papel, agência, contacto, ativar/suspender). */
export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 422 });

  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.whatsapp === "string") patch.whatsapp = b.whatsapp || null;
  if (typeof b.agencyId === "string") patch.agency_id = b.agencyId || null;
  if (typeof b.roleKey === "string") { patch.role_key = b.roleKey; patch.role = toEnumRole(b.roleKey); }
  if (typeof b.active === "boolean") patch.active = b.active;

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Suspender também bloqueia o login (ban); reativar levanta o bloqueio.
  if (typeof b.active === "boolean") {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: b.active ? "none" : "876000h" });
    } catch { /* best-effort */ }
  }
  return NextResponse.json({ ok: true });
}

/** DELETE — remove o consultor (perfil + utilizador Auth). */
export async function DELETE(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 422 });
  if (id === session.agent.id) return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("profiles").delete().eq("id", id);
  try { await admin.auth.admin.deleteUser(id); } catch { /* perfil já removido */ }
  return NextResponse.json({ ok: true });
}
