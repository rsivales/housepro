import "server-only";
import type { Agent } from "@/lib/data/types";
import type { Payout } from "@/lib/data/payments";
import { isStaff } from "@/lib/data/roles";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function listFinancialPayouts(agent:Agent,ownOnly=false) {
 const sb=createAdminClient();
 let query=sb.from("payouts").select("*, closure:deal_financial_closures!closure_id(closed_at,snapshot)").neq("status","anulado").order("created_at",{ascending:false});
 if(ownOnly || !isStaff(agent))query=query.eq("beneficiary_id",agent.id);
 else if(!isNetworkFinanceAdmin(agent))query=query.eq("agency_id",agent.agencyId);
 const {data,error}=await query;if(error)throw new Error("finance_read_failed");
 return data??[];
}
export function mapFinancialPayout(p:Awaited<ReturnType<typeof listFinancialPayouts>>[number]):Payout {
 return {id:p.id,dealRef:p.deal_ref||"—",beneficiaryId:p.beneficiary_id||"brand",beneficiaryName:p.beneficiary_name||"—",role:p.role,amount:Number(p.amount),status:p.status,createdAt:p.created_at,paidAt:p.paid_at??undefined};
}
export async function readRoyaltyReport() {
 const sb=createAdminClient();
 const [{data:closures,error},{data:payouts,error:payoutError}]=await Promise.all([
  sb.from("deal_financial_closures").select("id,deal_id,agency_id,property_reference,closed_at,gross,royalties_agent,royalties_agency,agency:agencies!agency_id(name)").eq("status","posted").order("closed_at",{ascending:false}),
  sb.from("payouts").select("closure_id,status,amount").eq("role","royalties").neq("status","anulado"),
 ]);
 if(error||payoutError)throw new Error("royalties_read_failed");
 const states=new Map((payouts??[]).map(p=>[p.closure_id,p.status]));
 const rows=(closures??[]).map(c=>({id:c.id,dealId:c.deal_id,agencyId:c.agency_id,agencyName:(Array.isArray(c.agency)?c.agency[0]:c.agency)?.name||"Agência",reference:c.property_reference,date:c.closed_at,gross:Number(c.gross),agent:Number(c.royalties_agent),agency:Number(c.royalties_agency),total:Math.round((Number(c.royalties_agent)+Number(c.royalties_agency))*100)/100,status:states.get(c.id)||"pendente"}));
 const total=Math.round(rows.reduce((sum,r)=>sum+r.total,0)*100)/100;
 const paid=Math.round(rows.filter(r=>r.status==="pago").reduce((sum,r)=>sum+r.total,0)*100)/100;
 return {total,paid,pending:Math.round((total-paid)*100)/100,rows};
}
