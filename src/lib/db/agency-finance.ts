import "server-only";
import type {Agent} from "@/lib/data/types";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {agencyTotals,canReadAgencyFinance,dayInLisbon,type AgencyClosure,type AgencyCash,type AgencyPeriod} from "@/lib/data/agency-finance";
import {createAdminClient} from "@/lib/supabase/admin";
export async function agencyWorkspaces(agent:Agent){const sb=createAdminClient();let settingsQuery=sb.from("agency_finance_settings").select("agency_id,broker_id,broker:profiles!broker_id(name)");if(!isNetworkFinanceAdmin(agent))settingsQuery=agent.roleKey==="diretor"?settingsQuery.eq("agency_id",agent.agencyId):settingsQuery.eq("broker_id",agent.id);const {data:settings,error:settingError}=await settingsQuery;if(settingError)throw new Error("agency_settings_unavailable");let q=sb.from("agencies").select("id,name,suspended").order("name");if(!isNetworkFinanceAdmin(agent)){const ids=[...new Set([...(settings??[]).map(s=>s.agency_id),...(agent.roleKey==="diretor"?[agent.agencyId]:[])])];if(!ids.length)return [];q=q.in("id",ids);}const {data,error}=await q;if(error)throw new Error("agency_unavailable");return (data??[]).map(a=>{const s=settings?.find(s=>s.agency_id===a.id);return {...a,brokerId:s?.broker_id||null,brokerName:(Array.isArray(s?.broker)?s.broker[0]:s?.broker)?.name||null};}).filter(a=>canReadAgencyFinance(agent,a.id,a.brokerId));}
export async function authorizedAgency(agent:Agent,id:string){const all=await agencyWorkspaces(agent);const agency=all.find(a=>a.id===id);if(!agency)throw new Error("forbidden");return agency;}
export async function agencyDashboard(agent:Agent,id:string,period:AgencyPeriod){const agency=await authorizedAgency(agent,id);const sb=createAdminClient();const results=await Promise.all([
 sb.from("deal_financial_closures").select("*").eq("agency_id",id).eq("status","posted").order("closed_at",{ascending:false}),
 sb.from("agency_financial_adjustments").select("closure_id,amount").eq("agency_id",id),
 sb.from("agency_cash_entries").select("*,creator:profiles!created_by(name)").eq("agency_id",id).gte("entry_date",period.from).lte("entry_date",period.to).order("entry_date",{ascending:false}).order("created_at",{ascending:false}),
 sb.from("payouts").select("amount,status,paid_at").eq("agency_id",id).eq("status","pago"),
 sb.from("deals").select("id,stage,property:properties!property_id(reference)").eq("agency_id",id),
 sb.from("profiles").select("id,name,role_key,public_title").eq("agency_id",id).eq("active",true).order("name"),
]);if(results.some(r=>r.error))throw new Error("agency_report_unavailable");
 const closures=((results[0].data??[]) as unknown as AgencyClosure[]).filter(c=>{const day=dayInLisbon(c.closed_at);return day>=period.from&&day<=period.to;});
 const cash=(results[2].data??[]).map(c=>({...c,createdBy:(Array.isArray(c.creator)?c.creator[0]:c.creator)?.name||"—"})) as AgencyCash[];
 const payments=(results[3].data??[]).filter(p=>p.paid_at&&dayInLisbon(p.paid_at)>=period.from&&dayInLisbon(p.paid_at)<=period.to);
 const totals=agencyTotals(closures,results[1].data??[],cash,payments);
 const production=new Map<string,AgencyClosure["snapshot"]["financials"]["producers"][number]&{count:number}>();
 for(const c of closures)for(const p of c.snapshot.financials.producers){const current=production.get(p.id);if(!current)production.set(p.id,{...p,count:1});else{current.count++;for(const key of ["commissionBase","agentGross","agencyGross","royalties","royaltiesAgency","pension","agentNet"] as const)current[key]+=Number(p[key]);}}
 const adjustments=new Map((results[1].data??[]).map(a=>[a.closure_id,Number(a.amount)]));
 return {agency,period,totals,closures:closures.map(c=>({id:c.id,dealId:c.deal_id,reference:c.property_reference,date:c.closed_at,gross:Number(c.gross),agencyGross:c.snapshot.financials.producers.reduce((n,p)=>n+Number(p.agencyGross),0),royalties:Number(c.royalties_agency),pensionBroker:Number(c.broker_pension_total)+(adjustments.get(c.id)||0),net:Number(c.agency_net)-(adjustments.get(c.id)||0)})),cash,cashDeals:(results[4].data??[]).filter(d=>d.stage!=="cancelado").map(d=>({dealId:d.id,reference:(Array.isArray(d.property)?d.property[0]:d.property)?.reference||d.id.slice(0,8)})),production:[...production.values()],openDeals:(results[4].data??[]).filter(d=>!["concluido","cancelado"].includes(d.stage)).length,team:results[5].data??[]};}
export type AgencyDashboard=Awaited<ReturnType<typeof agencyDashboard>>;
