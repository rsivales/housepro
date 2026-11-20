import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient,hasServiceRole } from "@/lib/supabase/admin";
import { mayEditProperty,UUID } from "@/lib/portfolio/server";
import { ActivityCapture } from "@/components/property/activity-capture";

export const dynamic="force-dynamic";
export const metadata={title:"Fichas de visita e propostas"};
export default async function PropertyActivityPage({searchParams}:{searchParams:Promise<{imovel?:string}>}) {
 const session=await getSession();if(!session)redirect("/entrar");
 const selected=(await searchParams).imovel??"";
 const db=hasServiceRole()?createAdminClient():null;
 const {data,error}=db?await db.from("properties").select("id,reference,title").eq("agent_id",session.agent.id).order("created_at",{ascending:false}).limit(500):{data:[],error:null};
 const properties=data??[];
 if(selected&&UUID.test(selected)&&!properties.some(p=>p.id===selected)&&await mayEditProperty(session.agent,selected)){
  const {data:property}=await db!.from("properties").select("id,reference,title").eq("id",selected).maybeSingle();
  if(property)properties.unshift(property);
 }
 return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <h1 className="font-display text-3xl">Fichas de visita e propostas</h1>
  <p className="mt-2 text-sm text-muted-foreground">Fotografe ou carregue o documento, reveja os dados e associe a atividade ao cliente, ao imóvel e ao CRM.</p>
  {error?<p role="status" className="mt-6">Não foi possível carregar os imóveis.</p>:<ActivityCapture properties={properties} initialId={selected}/>}
 </main>;
}
