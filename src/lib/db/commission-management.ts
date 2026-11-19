import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {isCommercialAgent} from "@/lib/data/agent-directory";
import type {Agent} from "@/lib/data/types";
import {agencyWorkspaces,authorizedAgency} from "./agency-finance";
export {commissionCycles} from "./commission-cycles";
import {commissionCycles} from "./commission-cycles";
export async function commissionTeam(actor:Agent,agencyId:string){
 await authorizedAgency(actor,agencyId);
 const {data,error}=await createAdminClient().from("profiles").select("id,role_key,public_title").eq("agency_id",agencyId).eq("active",true);
 if(error)throw new Error("Não foi possível consultar a equipa.");
 return (await commissionCycles((data??[]).filter(p=>isCommercialAgent({roleKey:p.role_key,publicTitle:p.public_title})&&p.role_key!=="parceiro").map(p=>p.id))).sort((a,b)=>a.name.localeCompare(b.name,"pt"));
}
export async function managementRequests(actor:Agent,agencyId?:string){
 const master=isNetworkFinanceAdmin(actor);const workplaces=await agencyWorkspaces(actor);
 if(agencyId)await authorizedAgency(actor,agencyId);
 const sb=createAdminClient();let query=sb.from("agency_management_requests").select("*").order("created_at",{ascending:false}).limit(100);
 if(agencyId)query=query.eq("agency_id",agencyId);else if(!master)query=query.in("agency_id",workplaces.map(a=>a.id));
 const {data,error}=await query;if(error)throw new Error("Não foi possível consultar os pedidos.");
 const ids=[...new Set((data??[]).flatMap(r=>[r.requested_by,r.decided_by,r.agent_id]).filter(Boolean))];
 const {data:profiles,error:profileError}=ids.length?await sb.from("profiles").select("id,name").in("id",ids):{data:[],error:null};
 if(profileError)throw new Error("Não foi possível identificar os pedidos.");
 const names=new Map((profiles??[]).map(p=>[p.id,p.name]));const agencyNames=new Map(workplaces.map(a=>[a.id,a.name]));
 return (data??[]).map(r=>({...r,requester:names.get(r.requested_by)??"—",decider:names.get(r.decided_by)??"—",agentName:names.get(r.agent_id)??"—",agencyName:agencyNames.get(r.agency_id)??"—"}));
}
export type ManagementRequest=Awaited<ReturnType<typeof managementRequests>>[number];
