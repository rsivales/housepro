import { NextResponse } from "next/server";

import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { operationOf } from "@/lib/imovel/model";

/** Cria um imóvel no Supabase, com o angariador = utilizador autenticado. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let d: Record<string, unknown>;
  try {
    d = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // The database assigns the canonical reference under the consultant row lock.
  // Individual creation, historical imports and fraction batches share this rule.
  const legacyReference = typeof d.legacyReference === "string" && d.legacyReference.trim() ? d.legacyReference.trim() : null;

  const title =
    typeof d.seoTitle === "string" && d.seoTitle.trim()
      ? d.seoTitle.trim()
      : `${String(d.type ?? "Imóvel")}${d.typology ? " " + String(d.typology) : ""} · ${String(
          d.parish || d.municipality || "Portugal"
        )}`;

  if (!hasServiceRole()) return NextResponse.json({error:"Serviço de permissões indisponível."},{status:503});
  const {data: caps,error: capsError}=await createAdminClient().rpc("portfolio_caps",{p_actor:session.agent.id});
  if(capsError) return NextResponse.json({error:"Sem permissão para criar imóveis."},{status:403});
  const isAdminOrAmi=Boolean(caps.ownAMI || (caps.approveAgency && ["admin","superadmin"].includes(session.agent.roleKey ?? session.agent.role)));


  // Operação coarse derivada do tipo de negócio (compat. com filtros/portais).
  const businessType = typeof d.businessType === "string" && d.businessType ? d.businessType : (d.operation === "arrendamento" ? "arrendamento" : "venda");
  const operation = operationOf(businessType);

  const row = {
    reference: null,
    legacy_reference: legacyReference,
    title,
    operation,
    business_type: businessType,
    type: String(d.type ?? "Apartamento"),
    typology: d.typology ? String(d.typology) : null,
    price: Number(d.price ?? 0),
    price_visible: d.priceVisible === false ? false : true,
    location_privacy: typeof d.locationPrivacy === "string" ? d.locationPrivacy : "approx",
    area: d.area != null ? Number(d.area) : null,
    area_util: d.areaUtil != null ? Number(d.areaUtil) : null,
    land_area: d.landArea != null ? Number(d.landArea) : null,
    beds: d.beds != null ? Number(d.beds) : null,
    baths: d.baths != null ? Number(d.baths) : null,
    parish: d.parish ? String(d.parish) : null,
    municipality: d.municipality ? String(d.municipality) : null,
    district: d.distrito ? String(d.distrito) : null,
    is_development: Boolean(d.isDevelopment),
    development_name: d.developmentName ? String(d.developmentName) : null,
    unit_label: typeof d.unitLabel === "string" ? d.unitLabel.trim().slice(0,50) || null : null,
    development_stage: d.developmentStage ? String(d.developmentStage) : null,
    development_units: d.developmentUnits != null ? Number(d.developmentUnits) : null,
    energy: d.energy ? String(d.energy) : "C",
    cpcv_at: d.cpcvAt ? String(d.cpcvAt) : null,
    status: typeof d.status === "string" && d.status ? String(d.status) : "novo",
    cover_url: d.coverUrl ? String(d.coverUrl) : null,
    gallery: Array.isArray(d.gallery) && d.gallery.length ? d.gallery : null,
    gallery_meta: Array.isArray(d.galleryMeta) && d.galleryMeta.length ? d.galleryMeta : null,
    plans: Array.isArray(d.plans) && d.plans.length ? d.plans : null,
    document_kinds: Array.isArray(d.documentKinds) && d.documentKinds.length ? d.documentKinds : null,
    documents_meta: Array.isArray(d.documentsMeta) && d.documentsMeta.length ? d.documentsMeta : null,
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
    cmi_exclusive: d.cmiExclusive === false ? false : true,
    cmi_renewable: Boolean(d.cmiRenewable),
    cmi_start: d.cmiStart ? String(d.cmiStart) : null,
    cmi_months: d.cmiMonths != null ? Number(d.cmiMonths) : null,
    energy_cert_expiry: d.energyCertExpiry ? String(d.energyCertExpiry) : null,
    development_typologies: d.developmentTypologies ? String(d.developmentTypologies) : null,
    development_price_from: d.developmentPriceFrom != null ? Number(d.developmentPriceFrom) : null,
    development_delivery: d.developmentDelivery ? String(d.developmentDelivery) : null,
    expenses: Array.isArray(d.expenses) && d.expenses.length ? d.expenses : null,
    owner_name: d.ownerName ? String(d.ownerName) : null,
    owner_phone: d.ownerPhone ? String(d.ownerPhone) : null,
    owner_email: d.ownerEmail ? String(d.ownerEmail) : null,
    owner_nif: d.ownerNif ? String(d.ownerNif) : null,
    tags: Array.isArray(d.tags) && d.tags.length ? d.tags : null,
    has_placa: Boolean(d.hasPlaca),
    has_keys: Boolean(d.hasKeys),
    listing_state: ["activo", "pendente", "inactivo"].includes(String(d.listingState)) ? String(d.listingState) : "activo",
    off_market: Boolean(d.offMarket),
    license_endorsed: Boolean(d.licenseEndorsed),
    commission_type: d.comissaoTipo === "fixed" ? "fixed" : "percent",
    commission_pct: d.comissaoTipo === "percent" ? Number(d.comissao ?? 0) : null,
    commission_fixed: d.comissaoTipo === "fixed" ? Number(d.comissaoFixo ?? 0) : null,
    commission_justification:
      typeof d.comissaoJustificacao === "string" && d.comissaoJustificacao.trim() ? d.comissaoJustificacao.trim() : null,
    // Candidatura à coleção Signature — fica pendente de revisão/aprovação do
    // admin/direção em /admin/signature; nunca entra aprovada diretamente.
    // signature_status é "not null" na base de dados, por isso tem sempre de
    // levar um valor — só conta quando is_signature é true (ver bug anterior,
    // a coluna tem default 'candidate' para todos os imóveis históricos).
    is_signature: Boolean(d.signatureCandidate),
    signature_status: "candidate",
    short_description: d.descricaoCurta ? String(d.descricaoCurta) : null,
    seo_description: d.seoDescription ? String(d.seoDescription) : null,
    keywords: d.keywords ? String(d.keywords) : null,
    slug: d.slug ? String(d.slug) : null,
    description: d.descricao ? String(d.descricao) : null,
    construction_year: d.anoConstrucao ? Number(d.anoConstrucao) : null,
    elevator: Boolean(d.elevador),
    accessible: Boolean(d.rampa),
    garage: Boolean(d.estacionamento),
    view_type: d.vista ? String(d.vista) : null,
    amenities: Array.isArray(d.equipamentos) && d.equipamentos.length ? d.equipamentos : null,
    neighborhood_notes: d.comunidade ? String(d.comunidade) : null,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(row)
    .select("id, reference")
    .single();

  if (error) {
    if (/reference_already_exists|properties_reference_key/.test(error.message)) return NextResponse.json({error:"Esta referência já existe no Helix. Abra o imóvel existente para o editar."},{status:409});
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id, reference: data.reference });
}
