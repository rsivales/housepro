import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEAL_STEPS } from "@/lib/data/deal";
import { type ReportData, type ReportSection } from "./model";

export const validEmail = (email: unknown): email is string =>
  typeof email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
const euro = (amount: number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(amount);
export async function reportContext(propertyId: string) {
  const db = createAdminClient();
  const { data: property, error } = await db.from("properties").select(
    "id,reference,title,agent_id,owner_name,owner_email,price,status,approval,listing_state,off_market,listed_at,created_at,video_url,tour_url,has_placa",
  ).eq("id",propertyId).maybeSingle();
  if (error || !property) throw new Error("Imóvel indisponível.");
  const { data: agent, error: agentError } = await db.from("profiles")
    .select("id,name,email,photo_url,agency_id,active").eq("id",property.agent_id).maybeSingle();
  if (agentError || !agent?.active) throw new Error("O consultor responsável está indisponível.");
  return { property, agent };
}
async function count(query: PromiseLike<{count:number|null;error:unknown}>) {
  const result = await query;
  if (result.error) throw new Error("Não foi possível obter todas as métricas do relatório.");
  return result.count ?? 0;
}
export async function buildReportData(propertyId: string, from: string, until: string, sections: ReportSection[]) {
  const { property:p, agent:a } = await reportContext(propertyId);
  const db = createAdminClient();
  const blocks: ReportData["blocks"] = [];
  if (sections.includes("visits")) {
    const escapedReference = String(p.reference).replace(/\\/g,"\\\\").replace(/"/g,'\\"');
    const base = () => db.from("visits").select("id",{count:"exact",head:true})
      .or(`property_id.eq.${propertyId},and(property_id.is.null,property_ref.eq."${escapedReference}")`).gte("at",from).lt("at",until);
    const [done,scheduled] = await Promise.all([count(base().eq("status","feita")),count(base().eq("status","agendada"))]);
    blocks.push({key:"visits",title:"Visitas no período",lines:[`${done} realizadas · ${scheduled} ainda registadas como agendadas neste período.`]});
  }
  if (sections.includes("leads")) {
    const base = () => db.from("leads").select("id",{count:"exact",head:true}).eq("property_id",propertyId).gte("created_at",from).lt("created_at",until);
    const sources = ["site","facebook","portal","whatsapp","consultor"];
    const values = await Promise.all(sources.map(source=>count(base().eq("source",source))));
    const total = values.reduce((sum,n)=>sum+n,0);
    const sourceLabels = ["Website HousePro","Meta (Facebook/Instagram)","Portais","WhatsApp","Consultor"];
    blocks.push({key:"leads",title:"Pedidos de informação no período",lines:[`${total} pedidos associados ao imóvel.`,...values.map((value,i)=>`${sourceLabels[i]}: ${value}.`)]});
  }
  if (sections.includes("views")) {
    const views = await count(db.from("property_engagement").select("property_id",{count:"exact",head:true}).eq("property_id",propertyId).eq("kind","view").gte("created_at",from).lt("created_at",until));
    blocks.push({key:"views",title:"Website no período",lines:[`${views} visualizações registadas no website HousePro.`]});
  }
  if (sections.includes("matches")) {
    const matches = await count(db.from("buyer_matches").select("id",{count:"exact",head:true}).eq("property_id",propertyId).eq("active",true));
    blocks.push({key:"matches",title:"Procura compatível atual",lines:[`${matches} perfis de compradores com correspondência ativa no Helix.`]});
  }
  if (sections.includes("proposals")) {
    const {data:deals,error} = await db.from("deals").select("id,stage,amount,created_at").eq("property_id",propertyId).order("created_at",{ascending:false}).limit(101);
    if (error || (deals?.length??0)>100) throw new Error("Não foi possível obter todos os negócios do imóvel.");
    const ids = (deals??[]).map(d=>d.id);
    let transitions: {to_stage:string}[] = [];
    if (ids.length) {
      const {data,error:eventsError}=await db.from("deal_events").select("to_stage").in("deal_id",ids).gte("created_at",from).lt("created_at",until).limit(501);
      if(eventsError || (data?.length??0)>500) throw new Error("Não foi possível obter as fases de negociação.");
      transitions = data??[];
    }
    const newDeals=(deals??[]).filter(d=>d.created_at>=from && d.created_at<until);
    const latest=deals?.[0];
    blocks.push({key:"proposals",title:"Propostas e negociação",lines:[
      `${newDeals.length} novos processos de proposta registados no período.`,
      ...DEAL_STEPS.map(step=>({label:step.label,count:transitions.filter(t=>t.to_stage===step.stage).length})).filter(v=>v.count).map(v=>`${v.label}: ${v.count} movimentos no período.`),
      latest ? `Estado do processo mais recente: ${DEAL_STEPS.find(s=>s.stage===latest.stage)?.label??"Cancelado"}.` : "Sem processos de proposta registados.",
    ]});
  }
  if (sections.includes("prices")) {
    const {data,error}=await db.from("property_price_history").select("old_price,new_price,created_at").eq("property_id",propertyId).gte("created_at",from).lt("created_at",until).order("created_at",{ascending:false}).limit(101);
    if(error || (data?.length??0)>100) throw new Error("Não foi possível obter o histórico de preços.");
    blocks.push({key:"prices",title:"Preço e alterações",lines:[`Preço atual: ${euro(Number(p.price))}.`,...(data?.length?data.map(v=>`${new Date(v.created_at).toLocaleDateString("pt-PT")}: ${euro(Number(v.old_price))} → ${euro(Number(v.new_price))}.`):["Sem alterações de preço registadas no período."])]});
  }
  if (sections.includes("promotion")) {
    const {data:links,error}=await db.from("campaign_properties").select("campaign_id").eq("property_id",propertyId).limit(101);
    if(error || (links?.length??0)>100) throw new Error("Não foi possível obter as campanhas.");
    const ids=(links??[]).map(v=>v.campaign_id);
    const {data:campaigns,error:campaignError}=ids.length ? await db.from("campaigns").select("name,status,type,meta_campaign_id").in("id",ids) : {data:[],error:null};
    if(campaignError) throw new Error("Não foi possível obter as campanhas.");
    const site=p.approval==="aprovado" && p.listing_state==="activo" && !p.off_market;
    const {data:audit,error:auditError}=await db.from("property_audit").select("action,changes,created_at")
      .eq("property_id",propertyId).gte("created_at",from).lt("created_at",until).order("created_at",{ascending:false}).limit(201);
    if(auditError || (audit?.length??0)>200)throw new Error("Não foi possível obter as ações de promoção.");
    const publicChanges:Record<string,string> = {
      title:"Título do anúncio",description:"Descrição do anúncio",shortDescription:"Resumo do anúncio",
      photos:"Fotografias",gallery:"Fotografias",cover_url:"Fotografia principal",
      videoUrl:"Vídeo",video_url:"Vídeo",tourUrl:"Visita virtual",tour_url:"Visita virtual",
      hasPlaca:"Placa de promoção",has_placa:"Placa de promoção",
    };
    const changes=new Set<string>();
    for(const event of audit??[]){
      for(const change of Array.isArray(event.changes)?event.changes:[]){
        if(typeof change.field==="string" && publicChanges[change.field])changes.add(publicChanges[change.field]);
      }
    }
    blocks.push({key:"promotion",title:"Promoção e recursos atuais",lines:[
      ...[...changes].map(label=>`${label}: atualização registada no período.`),
      site?"Imóvel disponível na montra HousePro.":"Imóvel atualmente fora da montra pública.",
      ...[p.video_url&&"Vídeo do imóvel disponível.",p.tour_url&&"Visita virtual disponível.",p.has_placa&&"Placa de promoção registada."].filter((s):s is string=>Boolean(s)),
      ...(campaigns??[]).filter(c=>c.type!=="RECRUITMENT").map(c=>`Campanha associada: ${c.name} · estado registado: ${c.status}${c.meta_campaign_id?" · associada à Meta":""}.`),
      "Alcance, impressões e cliques das redes sociais e dos portais não estão disponíveis neste relatório.",
    ]});
  }
  return { property:p, agent:a, data:{
    propertyId,reference:p.reference,title:p.title,ownerName:p.owner_name??"",
    agentName:a.name,agentEmail:a.email??"",agentPhoto:a.photo_url??undefined,from,until,blocks,
  } satisfies ReportData };
}
/** Team leaders are the accompaniment managers. Sponsorship is a separate network relationship. */
export async function reportRecipients(agentId: string, agencyId: string) {
  const db=createAdminClient();
  const [{data:members,error:memberError},{data:settings,error:settingError}]=await Promise.all([
    db.from("team_members").select("team_id").eq("profile_id",agentId),
    db.from("agency_finance_settings").select("broker_id").eq("agency_id",agencyId).maybeSingle(),
  ]);
  if(memberError||settingError)throw new Error("Não foi possível determinar os destinatários internos.");
  const teamIds=(members??[]).map(m=>m.team_id);
  const {data:teams,error:teamError}=teamIds.length?await db.from("teams").select("leader_id").in("id",teamIds).eq("agency_id",agencyId).eq("status","aprovada"):{data:[],error:null};
  if(teamError)throw new Error("Não foi possível determinar os gestores.");
  const leaderIds=[...new Set((teams??[]).map(t=>t.leader_id).filter(Boolean))];
  const ids=[...new Set([agentId,...leaderIds,settings?.broker_id].filter(Boolean))];
  const {data:people,error}=await db.from("profiles").select("id,email,active").in("id",ids).eq("active",true);
  if(error)throw new Error("Não foi possível confirmar os destinatários.");
  const email=(id:string)=>people?.find(p=>p.id===id)?.email;
  const bcc=[agentId,...leaderIds].map(email).filter(validEmail);
  return {bcc:[...new Set(bcc)],broker:validEmail(email(settings?.broker_id))?email(settings?.broker_id) as string:null};
}
