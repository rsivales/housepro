import {createAdminClient} from "@/lib/supabase/admin";
import type {CommissionCycle} from "@/lib/data/commission-cycle";
export async function commissionCycles(ids:string[]):Promise<CommissionCycle[]> {
 if(!ids.length)return [];
 const {data,error}=await createAdminClient().rpc("commission_cycle_summaries",{p_agents:ids});
 if(error)throw new Error("Não foi possível calcular os ciclos de comissionamento.");
 return data as CommissionCycle[];
}

/** Personal net from immutable posted closures in the Lisbon calendar month. */
export async function personalMonthNet(agentId:string,agencyId:string,now=new Date()) {
 const month=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit"}).format(now);
 const [y,m]=month.split('-').map(Number);
 const from=new Date(Date.UTC(y,m-1,0)).toISOString();
 const until=new Date(Date.UTC(y,m,2)).toISOString();
 const {data,error}=await createAdminClient().from("deal_financial_closures").select("closed_at,snapshot").eq("status","posted").eq("agency_id",agencyId).gte("closed_at",from).lt("closed_at",until);
 if(error)throw new Error("Não foi possível consultar os fechos do mês.");
 return (data??[]).filter(c=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit"}).format(new Date(c.closed_at))===month).reduce((sum,c)=>sum+(c.snapshot?.financials?.producers??[]).filter((p:{id:string})=>p.id===agentId).reduce((n:number,p:{agentNet:number})=>n+Number(p.agentNet),0),0);
}
