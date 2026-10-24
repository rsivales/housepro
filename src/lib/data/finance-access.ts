import type { Agent } from "./types";
export function isNetworkFinanceAdmin(agent: Pick<Agent,"roleKey"|"role">) {
 return ["admin","superadmin"].includes(agent.roleKey ?? agent.role);
}
export function canManagePayout(agent: Pick<Agent,"id"|"agencyId"|"roleKey"|"role">, payout:{agency_id:string|null;role:string}) {
 if(isNetworkFinanceAdmin(agent)) return true;
 return payout.role!=="royalties" && Boolean(agent.agencyId && agent.agencyId===payout.agency_id && ["diretor","coordenador"].includes(agent.roleKey??""));
}
export const formatMoney = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
