import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isBrandAdmin, isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { slugify, nextAgencyCode } from "@/lib/data/agencies";
import { listAgenciesReal } from "@/lib/db/repo";

/**
 * Gestão de agências — tabela real `agencies` (fonte única de verdade, ver
 * migration_agencies_real.sql). Duas camadas de permissão:
 *  - Rede (criar/eliminar, nome/slug/região/código/suspender): direção da
 *    marca — admin/super admin. Abrir ou fechar uma agência é uma decisão de
 *    rede, não de uma agência isolada.
 *  - Ficha pública de UMA agência (serviços, notícias, mostrar/ocultar
 *    vendidos/ativos/reservados, descrição, fotos, prémios, dados legais): o
 *    próprio broker (diretor) da agência, ou admin/super admin.
 */
const NETWORK_FIELDS = new Set(["name", "slug", "region", "code", "suspended"]);

async function requireStaff() {
  const session = await getSession();
  if (!session || session.demo || !isStaff(session.agent)) return null;
  return session;
}

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const agencies = await listAgenciesReal({ includeHidden: true });
  return NextResponse.json({ ok: true, agencies });
}

/** POST — cria uma agência nova na rede (admin/super admin). */
export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isBrandAdmin(session.agent) || session.agent.roleKey === "diretor") {
    return NextResponse.json({ error: "Abrir uma nova agência na rede é reservado à administração/super admin." }, { status: 403 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const region = String(b.region ?? "").trim();
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 422 });

  const admin = createAdminClient();
  const existing = await listAgenciesReal({ includeHidden: true });
  const slug = slugify(name);
  const code = nextAgencyCode(existing);

  const { data, error } = await admin
    .from("agencies")
    .insert({ name, slug, region: region || "—", code })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}

/** PATCH — edita uma agência existente. { id, ...campos } */
export async function PATCH(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 422 });

  const isNetworkAdmin = isBrandAdmin(session.agent) && session.agent.roleKey !== "diretor";
  const isOwnBroker = session.agent.roleKey === "diretor" && session.agent.agencyId === id;
  if (!isNetworkAdmin && !isOwnBroker) {
    return NextResponse.json({ error: "Sem permissão para editar esta agência." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  const wantsNetworkField = Object.keys(b).some((k) => NETWORK_FIELDS.has(k));
  if (wantsNetworkField && !isNetworkAdmin) {
    return NextResponse.json({ error: "Nome, slug, região, código e suspender/reativar são reservados à administração/super admin." }, { status: 403 });
  }

  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.slug === "string") patch.slug = slugify(b.slug);
  if (typeof b.region === "string") patch.region = b.region.trim();
  if (typeof b.code === "number") patch.code = b.code;
  if (typeof b.suspended === "boolean") patch.suspended = b.suspended;
  if (Array.isArray(b.services)) patch.services = b.services.filter((x): x is string => typeof x === "string");
  if (typeof b.showActive === "boolean") patch.show_active = b.showActive;
  if (typeof b.showSold === "boolean") patch.show_sold = b.showSold;
  if (typeof b.showReserved === "boolean") patch.show_reserved = b.showReserved;
  if (Array.isArray(b.news)) patch.news = b.news;
  if (typeof b.description === "string") patch.description = b.description;
  if (Array.isArray(b.photos)) patch.photos = b.photos.filter((x): x is string => typeof x === "string");
  if (Array.isArray(b.prizes)) patch.prizes = b.prizes;
  if (typeof b.amiLicense === "string") patch.ami_license = b.amiLicense;
  if (typeof b.amiExpires === "string") patch.ami_expires = b.amiExpires || null;
  if (typeof b.nipc === "string") patch.nipc = b.nipc;
  if (typeof b.cae === "string") patch.cae = b.cae;
  if (typeof b.legalEmail === "string") patch.legal_email = b.legalEmail;
  if (b.docs && typeof b.docs === "object") patch.docs = b.docs;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "empty_patch" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("agencies").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE — remove uma agência da rede (admin/super admin). Bloqueia se ainda
 *  tiver consultores atribuídos, para nunca desligar pessoas em silêncio. */
export async function DELETE(request: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isBrandAdmin(session.agent) || session.agent.roleKey === "diretor") {
    return NextResponse.json({ error: "Eliminar uma agência da rede é reservado à administração/super admin." }, { status: 403 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 422 });

  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("agency_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Esta agência ainda tem consultores atribuídos — reatribui-os primeiro ou suspende a agência em vez de a eliminar." }, { status: 409 });
  }

  const { error } = await admin.from("agencies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
