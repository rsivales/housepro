import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff, ROLE_LABEL } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { RoleKey } from "@/lib/data/types";

/**
 * Gestão de consultores (SUPERADMIN/admin/coordenação). Usa o service_role
 * para criar utilizadores em Auth + perfil. Todas as ações verificam o papel
 * do requerente (sessão) antes de usar o service_role.
 *
 * Toda a decisão de gestão de pessoas (papel, agência, suspender/reativar,
 * padrinho, criação, remoção) fica registada em `people_audit` — nada fica
 * "provisório": quem fez o quê, a quem e quando é sempre consultável depois
 * (ver GET .../audit).
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

type Change = { field: string; from: string; to: string };

/** Regista uma ação de gestão de pessoas — nunca falha a operação principal
 *  por causa disto (best-effort, mas sempre tentado). */
async function logPeopleAudit(
  admin: ReturnType<typeof createAdminClient>,
  args: { targetId: string; targetName: string; actor: { id: string; name: string; roleKey?: string }; action: string; changes?: Change[] }
) {
  try {
    await admin.from("people_audit").insert({
      target_id: args.targetId,
      target_name: args.targetName,
      actor_id: args.actor.id,
      actor_name: args.actor.name,
      actor_role: args.actor.roleKey ?? null,
      action: args.action,
      changes: args.changes ?? null,
    });
  } catch (e) {
    console.error("[people_audit] falha a registar", e);
  }
}

/** GET — lista consultores + agências (para os seletores). Com ?audit=<id>,
 *  devolve o histórico desse consultor em vez da lista. */
export async function GET(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const admin = createAdminClient();
  const auditFor = new URL(request.url).searchParams.get("audit");
  if (auditFor) {
    const { data, error } = await admin
      .from("people_audit")
      .select("id, action, changes, actor_name, actor_role, created_at")
      .eq("target_id", auditFor)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, entries: data ?? [] });
  }

  const [{ data: profiles }, { data: agencies }] = await Promise.all([
    admin.from("profiles").select("id, name, email, role, role_key, agency_id, whatsapp, active, sponsor_id, code").order("name"),
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
  // Código sequencial por agência — base da referência dos imóveis
  // (HP<agência><agente>-<seq>). Atribuído por um contador atómico e
  // monótono (nunca reutiliza um número, mesmo que um consultor seja
  // removido depois) — nunca por contagem de linhas, que reatribuiria o
  // mesmo número e duplicaria referências de imóveis já criados.
  let code: number | null = null;
  if (agencyId) {
    const { data: seqRow, error: seqErr } = await admin.rpc("next_agent_code", { p_agency: agencyId });
    if (seqErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: seqErr.message }, { status: 400 });
    }
    code = Number(seqRow);
  }
  const { error: pErr } = await admin.from("profiles").upsert({
    id: created.user.id, name, email, role: toEnumRole(roleKey), role_key: roleKey,
    agency_id: agencyId, whatsapp, active: true, code,
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  await logPeopleAudit(admin, {
    targetId: created.user.id, targetName: name, actor: session.agent, action: "criou",
    changes: [{ field: "Papel", from: "—", to: ROLE_LABEL[roleKey as RoleKey] ?? roleKey }],
  });

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

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("profiles")
    .select("name, email, whatsapp, agency_id, role_key, active, sponsor_id")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.email === "string") patch.email = b.email.trim().toLowerCase() || null;
  if (typeof b.whatsapp === "string") patch.whatsapp = b.whatsapp || null;
  if (typeof b.photoUrl === "string") patch.photo_url = b.photoUrl || null;
  if (typeof b.agencyId === "string") patch.agency_id = b.agencyId || null;
  if (typeof b.roleKey === "string") { patch.role_key = b.roleKey; patch.role = toEnumRole(b.roleKey); }
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("sponsorId" in b) {
    const sponsorId = b.sponsorId ? String(b.sponsorId) : null;
    if (sponsorId === id) return NextResponse.json({ error: "sponsor_cannot_be_self" }, { status: 422 });
    patch.sponsor_id = sponsorId;
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Suspender também bloqueia o login (ban); reativar levanta o bloqueio.
  if (typeof b.active === "boolean") {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: b.active ? "none" : "876000h" });
    } catch { /* best-effort */ }
  }

  // Histórico: só regista os campos que realmente mudaram, com nomes legíveis.
  const changes: Change[] = [];
  const roleLabel = (k?: string | null) => (k ? ROLE_LABEL[k as RoleKey] ?? k : "—");
  if ("name" in patch && patch.name !== before?.name) changes.push({ field: "Nome", from: before?.name ?? "—", to: String(patch.name) });
  if ("email" in patch && patch.email !== before?.email) changes.push({ field: "E-mail", from: before?.email ?? "—", to: String(patch.email ?? "—") });
  if ("whatsapp" in patch && patch.whatsapp !== before?.whatsapp) changes.push({ field: "WhatsApp", from: before?.whatsapp ?? "—", to: String(patch.whatsapp ?? "—") });
  if ("agency_id" in patch && patch.agency_id !== before?.agency_id) changes.push({ field: "Agência", from: before?.agency_id ?? "—", to: String(patch.agency_id ?? "—") });
  if ("role_key" in patch && patch.role_key !== before?.role_key) changes.push({ field: "Papel", from: roleLabel(before?.role_key), to: roleLabel(String(patch.role_key)) });
  if ("sponsor_id" in patch && patch.sponsor_id !== before?.sponsor_id) changes.push({ field: "Padrinho", from: before?.sponsor_id ?? "—", to: String(patch.sponsor_id ?? "—") });
  if ("active" in patch && patch.active !== before?.active) changes.push({ field: "Estado", from: before?.active === false ? "Suspenso" : "Ativo", to: patch.active ? "Ativo" : "Suspenso" });

  if (changes.length > 0) {
    const action = changes.length === 1 && changes[0].field === "Estado" ? (patch.active ? "reativou" : "suspendeu") : "editou";
    await logPeopleAudit(admin, {
      targetId: id, targetName: String(patch.name ?? before?.name ?? "—"), actor: session.agent, action, changes,
    });
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
  const { data: target } = await admin.from("profiles").select("name").eq("id", id).maybeSingle();

  // Regista ANTES de apagar — o FK de people_audit.target_id exige que o
  // perfil ainda exista no momento do insert; a remoção efetiva do perfil
  // depois faz o "on delete set null" limpar a referência automaticamente,
  // mas o registo (nome, autor, data) fica permanente.
  await logPeopleAudit(admin, { targetId: id, targetName: target?.name ?? "—", actor: session.agent, action: "removeu" });

  await admin.from("profiles").delete().eq("id", id);
  try { await admin.auth.admin.deleteUser(id); } catch { /* perfil já removido */ }

  return NextResponse.json({ ok: true });
}
