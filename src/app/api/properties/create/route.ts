import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** Cria um imóvel no Supabase, com o angariador = utilizador autenticado. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let d: Record<string, unknown>;
  try {
    d = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ref =
    typeof d.reference === "string" && d.reference.trim()
      ? d.reference.trim()
      : `HP-${Date.now().toString().slice(-6)}`;

  const title =
    typeof d.seoTitle === "string" && d.seoTitle.trim()
      ? d.seoTitle.trim()
      : `${String(d.type ?? "Imóvel")}${d.typology ? " " + String(d.typology) : ""} · ${String(
          d.parish || d.municipality || "Portugal"
        )}`;

  const isAdminOrAmi =
    session.agent.role === "admin" ||
    session.agent.roleKey === "admin" ||
    Boolean(session.agent.ownAMI);

  const row = {
    reference: ref,
    title,
    operation: d.operation === "arrendamento" ? "arrendamento" : "venda",
    type: String(d.type ?? "Apartamento"),
    typology: d.typology ? String(d.typology) : null,
    price: Number(d.price ?? 0),
    area: d.area != null ? Number(d.area) : null,
    beds: d.beds != null ? Number(d.beds) : null,
    baths: d.baths != null ? Number(d.baths) : null,
    parish: d.parish ? String(d.parish) : null,
    municipality: d.municipality ? String(d.municipality) : null,
    district: d.distrito ? String(d.distrito) : null,
    is_development: Boolean(d.isDevelopment),
    development_name: d.developmentName ? String(d.developmentName) : null,
    development_stage: d.developmentStage ? String(d.developmentStage) : null,
    development_units: d.developmentUnits != null ? Number(d.developmentUnits) : null,
    energy: d.energy ? String(d.energy) : "C",
    status: d.status === "rascunho" ? "rascunho" : "novo",
    cover_url: d.coverUrl ? String(d.coverUrl) : null,
    gallery: Array.isArray(d.gallery) && d.gallery.length ? d.gallery : null,
    video_url: d.videoUrl ? String(d.videoUrl) : null,
    tour_url: d.tourUrl ? String(d.tourUrl) : null,
    before_after:
      Array.isArray(d.beforeAfter) && d.beforeAfter.length ? d.beforeAfter : null,
    agent_id: session.agent.id,
    approval: isAdminOrAmi ? "aprovado" : "pendente",
    submitted_at: new Date().toISOString(),
    listed_at: new Date().toISOString().slice(0, 10),
    latitude: d.lat != null ? Number(d.lat) : null,
    longitude: d.lng != null ? Number(d.lng) : null,
    seller_type: d.sellerType === "empresa" ? "empresa" : "particular",
    commission_type: d.comissaoTipo === "fixed" ? "fixed" : "percent",
    commission_pct: d.comissaoTipo === "percent" ? Number(d.comissao ?? 0) : null,
    commission_fixed: d.comissaoTipo === "fixed" ? Number(d.comissaoFixo ?? 0) : null,
    short_description: d.descricaoCurta ? String(d.descricaoCurta) : null,
    description: d.descricao ? String(d.descricao) : null,
    construction_year: d.anoConstrucao ? Number(d.anoConstrucao) : null,
    elevator: Boolean(d.elevador),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(row)
    .select("id, reference")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id, reference: data.reference });
}
