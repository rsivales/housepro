import { DEFAULT_REGIME } from "./commission-regime";
export interface CommissionCycle {
 agentId:string; name:string; agencyId:string; joinedOn:string; dateConfirmed:boolean; cycleStart:string; cycleEnd:string; gross:number; closedDeals:number; listings:number; previousGross:number; annualRevenueGoal:number; annualListingsGoal:number; companyValidated:boolean; proProducer:boolean; policyVersion:number; recentListings:number;
}
export function cycleProgress(c:CommissionCycle, today=new Date()) {
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(today);
 const daysLeft=Math.max(0,Math.ceil((Date.parse(c.cycleEnd)-Date.parse(day))/86400000));
 const duration=Math.max(1,(Date.parse(c.cycleEnd)-Date.parse(c.cycleStart))/86400000);
 const elapsed=Math.max(0,Math.min(1,1-daysLeft/duration));
 const band=DEFAULT_REGIME.ladder.find(b=>b.upTo===null||c.gross<b.upTo)!;
 const rate=c.proProducer?80:c.companyValidated?band.withCompany:band.withoutCompany;
 const next=c.gross<10000?10000:c.gross<60000?60000:null;
 const gap=next===null?0:Math.max(0,next-c.gross);
 const average=c.closedDeals>0?c.gross/c.closedDeals:null;
 const estimatedDeals=average&&gap>0?Math.ceil(gap/average):null;
 const goalGap=Math.max(0,c.annualRevenueGoal-c.gross);
 const previousBand=c.previousGross>=60000?60000:c.previousGross>=10000?10000:0;
 const risk=!c.proProducer&&daysLeft<=90&&previousBand>0&&c.gross<previousBand;
 const offPace=elapsed>=0.25&&c.gross<c.annualRevenueGoal*elapsed*0.75;
 const listingsRisk=c.annualListingsGoal>0&&elapsed>=0.25&&c.listings<c.annualListingsGoal*elapsed*0.75;
 return {daysLeft,rate,next,gap,average,estimatedDeals,goalGap,goalDeals:average&&goalGap?Math.ceil(goalGap/average):null,elapsed,risk,offPace,listingsRisk};
}
export function validAgentPolicy(value:unknown) {
 const p=value as Record<string,unknown>|null;
 return Boolean(p&&typeof p.joinedOn==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(p.joinedOn)&&!Number.isNaN(Date.parse(p.joinedOn))&&new Date(p.joinedOn).toISOString().slice(0,10)===p.joinedOn&&p.joinedOn>="1900-01-01"&&p.joinedOn<=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())&&typeof p.annualRevenueGoal==="number"&&Number.isFinite(p.annualRevenueGoal)&&p.annualRevenueGoal>=1000&&p.annualRevenueGoal<=10000000&&typeof p.annualListingsGoal==="number"&&Number.isInteger(p.annualListingsGoal)&&p.annualListingsGoal>=0&&p.annualListingsGoal<=1000);
}
