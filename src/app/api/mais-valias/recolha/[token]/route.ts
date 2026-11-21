import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {isSupabaseConfigured} from "@/lib/supabase/env";

type Params={params:Promise<{token:string}>};
async function lookup(token:string){
  if(!isSupabaseConfigured()||!/^[-_A-Za-z0-9]{40,60}$/.test(token))return null;
  const hash=createHash("sha256").update(token).digest("hex");
  const {data}=await createAdminClient().from("mv_client_intake").select("id,client_name,expires_at,completed_at").eq("token_hash",hash).maybeSingle();
  return data&&new Date(data.expires_at).getTime()>Date.now()&&!data.completed_at?data:null;
}
export async function GET(_:Request,{params}:Params){const item=await lookup((await params).token);return item?NextResponse.json({name:item.client_name},{headers:{"cache-control":"no-store"}}):NextResponse.json({error:"Ligação expirada ou já utilizada."},{status:404});}
export async function POST(request:Request,{params}:Params){
  const item=await lookup((await params).token);if(!item)return NextResponse.json({error:"Ligação expirada ou já utilizada."},{status:404});
  const body=await request.json().catch(()=>null);
  if(!body||body.consent!==true||typeof body.answers!=="object"||Array.isArray(body.answers))return NextResponse.json({error:"Confirme a autorização e os dados."},{status:422});
  const fields=["rendimentoColetavel","rendimentoConjuge","dependentes","tributacaoConjunta","domicilioFiscal12Meses","reinvestimentoNoPrazo","reinvestimentoFundosProprios","apoioPublicoRelevante","outroGanhoMesmoAno","situacaoEspecial"] as const;
  const answers:Record<string,string|boolean>={};
  for(const field of fields){const value=body.answers[field];if(typeof value==="boolean")answers[field]=value;else if(typeof value==="string"&&/^\d{0,9}([.,]\d{0,2})?$/.test(value))answers[field]=value;else if(value!=null&&value!=="")return NextResponse.json({error:"Dados inválidos."},{status:422});}
  const now=new Date().toISOString();
  const {data,error}=await createAdminClient().from("mv_client_intake").update({answers,consent_at:now,consent_text:"Informado sobre finalidade da simulação de mais-valias e tratamento de dados, conforme política de privacidade; autorização facultativa confirmada pelo cliente.",completed_at:now}).eq("id",item.id).is("completed_at",null).select("id").maybeSingle();
  return error||!data?NextResponse.json({error:"Não foi possível guardar; tente novamente."},{status:503}):NextResponse.json({ok:true});
}
