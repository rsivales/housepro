import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isBrandAdmin } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { buildFeed, eligible, listingProblems, TEST_CUSTOMER_CODE, type Override } from "@/lib/idealista/feed";
import { ftpConfigured, readConfig, readListings } from "@/lib/idealista/server";

export const dynamic="force-dynamic";
async function permitted() { const session=await getSession();return session && !session.demo && isBrandAdmin(session.agent) ? session.agent : null; }
export async function GET(request:Request) {
 const agent=await permitted();if(!agent) return NextResponse.json({error:"Sem permissão."},{status:403});
 if(!hasServiceRole()) return NextResponse.json({error:"Serviço indisponível."},{status:503});
 try {
  const config=await readConfig();if(!config)return NextResponse.json({error:"Conta de exportação por configurar."},{status:503});
  if(agent.roleKey==="diretor" && agent.agencyId!==config.agency_id)return NextResponse.json({error:"Esta conta pertence a outra agência."},{status:403});
  const listings=await readListings(config.agency_id);
  const mode=new URL(request.url).searchParams.get("download");
  // The sample is only for technical review. The example ILC can NEVER be sent by the scheduler.
  const feed=buildFeed(listings,{...config,customer_code:config.customer_code || TEST_CUSTOMER_CODE});
  if(mode) {
   if(feed.problems.length || feed.schemaErrors.length || !feed.count) return NextResponse.json({error:"Corrija os imóveis selecionados antes de gerar o ficheiro.",problems:feed.problems,schemaErrors:feed.schemaErrors},{status:422});
   return new Response(JSON.stringify(feed.payload,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="${config.customer_code || TEST_CUSTOMER_CODE}_helix_${config.customer_code ? "revisao" : "EXEMPLO-ILC"}.json"`,"cache-control":"no-store"}});
  }
  return NextResponse.json({config,ftpConfigured:ftpConfigured(),count:feed.count,schemaErrors:feed.schemaErrors,problems:feed.problems,listings:listings.map(p=>({id:p.id,reference:p.reference,title:p.title,legacyReference:p.legacy_reference,area:p.area,beds:p.beds,isDevelopment:p.is_development,eligible:eligible(p),excludedReason:eligible(p)?null:"Não está aprovado/ativo/disponível para publicação",problems:listingProblems(p,config.overrides[p.id])}))},{headers:{"cache-control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao ler a integração."},{status:503});}
}
export async function PUT(request:Request) {
 const agent=await permitted();if(!agent)return NextResponse.json({error:"Sem permissão."},{status:403});
 if(!hasServiceRole())return NextResponse.json({error:"Serviço indisponível."},{status:503});
 const body=await request.json().catch(()=>null);
 if(!body || !Array.isArray(body.property_ids) || typeof body.overrides!=="object" || !body.overrides || Array.isArray(body.overrides))return NextResponse.json({error:"Configuração inválida."},{status:400});
 try {
  const current=await readConfig();if(!current)return NextResponse.json({error:"Conta de exportação em falta."},{status:503});
  if(agent.roleKey==="diretor" && agent.agencyId!==current.agency_id)return NextResponse.json({error:"Esta conta pertence a outra agência."},{status:403});
  const listings=await readListings(current.agency_id);const ids=new Set(listings.map(p=>p.id));
  if(body.property_ids.some((id:unknown)=>typeof id!=="string" || !ids.has(id)))return NextResponse.json({error:"Selecione apenas imóveis desta conta HousePro."},{status:400});
  const customerCode=String(body.customer_code??"").trim();
  if(customerCode && (!/^ilc[a-z0-9]{40}$/.test(customerCode) || customerCode===TEST_CUSTOMER_CODE))return NextResponse.json({error:"O ILC deve ser o código real da conta: ilc seguido de 40 caracteres."},{status:400});
  const overrides: Record<string,Override>={};
  for(const [id,value] of Object.entries(body.overrides)) {
   if(!ids.has(id) || !value || typeof value!=="object" || Array.isArray(value))return NextResponse.json({error:"Dados do imóvel inválidos."},{status:400});
   const input=value as Override;const out:Override={};
   for(const key of ["reference","propertyCode"] as const)if(input[key]) {if(typeof input[key]!=="string" || input[key]!.length>50)return NextResponse.json({error:"Referência/código demasiado longo."},{status:400});out[key]=input[key]!.trim();}
   for(const key of ["area","bedrooms"] as const)if(input[key]!=null){if(!Number.isInteger(input[key]) || input[key]!<(key==="area"?1:0))return NextResponse.json({error:"Área ou quartos inválidos."},{status:400});out[key]=input[key];}
   if(current.last_hash && (out.propertyCode || id)!==(current.overrides[id]?.propertyCode || id))return NextResponse.json({error:"O código de um imóvel já enviado não pode ser alterado."},{status:409});
   overrides[id]=out;
  }
  // Explicit empty overrides also cannot reset a migrated immutable code.
  if(current.last_hash && Object.entries(current.overrides).some(([id,o])=>o.propertyCode && (overrides[id]?.propertyCode || id)!==o.propertyCode))return NextResponse.json({error:"Mantenha os códigos dos imóveis já enviados."},{status:409});
  if(current.last_hash && current.customer_code!==customerCode)return NextResponse.json({error:"A mudança de conta ILC exige revisão da integração."},{status:409});
  const patch={customer_code:customerCode,property_ids:[...new Set(body.property_ids)] as string[],overrides,development_service:body.development_service===true,review_approved:body.review_approved===true,migration_confirmed:body.migration_confirmed===true,enabled:body.enabled===true};
  const feed=buildFeed(listings,patch);
  if(patch.enabled && (!customerCode || !ftpConfigured() || !patch.review_approved || !patch.migration_confirmed || !feed.count || feed.problems.length || feed.schemaErrors.length))return NextResponse.json({error:"Antes de ativar: ILC real, FTP configurado, revisão aprovada, referências confirmadas e imóveis sem erros."},{status:422});
  const {error}=await createAdminClient().from("idealista_export_config").update({...patch,updated_at:new Date().toISOString()}).eq("id","housepro");
  if(error)throw new Error("Não foi possível guardar a configuração.");
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao guardar."},{status:503});}
}
