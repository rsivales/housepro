import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { authorizedAgency } from "@/lib/db/agency-finance";
import { readCommissionRegime } from "@/lib/db/commission-regime";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRegime } from "@/lib/data/commission-regime";

const uuid = (v: unknown) => typeof v === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const agencyId = new URL(request.url).searchParams.get("agencyId");
  if (!uuid(agencyId)) return NextResponse.json({ error: "Agência inválida." }, { status: 400 });
  try { await authorizedAgency(session.agent, agencyId!); return NextResponse.json(await readCommissionRegime(agencyId!)); }
  catch { return NextResponse.json({ error: "Sem acesso ao regime desta agência." }, { status: 403 }); }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.demo || session.viewingAs) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !uuid(body.agencyId) || !Number.isSafeInteger(body.version) || body.version < 0 || !validateRegime(body.plan))
    return NextResponse.json({ error: "Reveja os patamares, percentagens e limites do regime." }, { status: 422 });
  try { await authorizedAgency(session.agent, body.agencyId); }
  catch { return NextResponse.json({ error: "Sem acesso ao comissionamento desta agência." }, { status: 403 }); }
  const sb = createAdminClient();
  const {data,error}=await sb.rpc("request_agency_management",{p_agency:body.agencyId,p_agent:null,p_kind:"regime",p_payload:body.plan,p_version:body.version,p_reason:typeof body.reason==="string"?body.reason:"Pedido de revisão do regime de comissionamento",p_actor:session.agent.id});
  if(error)return NextResponse.json({error:"Já existe um pedido pendente ou a versão foi alterada."},{status:409});
  return NextResponse.json({ok:true,pending:true,id:data});
}
