import type {Agent} from "./types";
import {isNetworkFinanceAdmin} from "./finance-access";
export function canReadAgencyFinance(agent:Pick<Agent,"id"|"agencyId"|"roleKey"|"role">,agencyId:string,brokerId?:string|null){return isNetworkFinanceAdmin(agent)||brokerId===agent.id||(agent.roleKey==="diretor"&&agent.agencyId===agencyId);}
export const dayInLisbon=(date:Date|string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(date));
export function agencyPeriod(from?:string,to?:string){const today=dayInLisbon(new Date());const result={from:from||`${today.slice(0,4)}-01-01`,to:to||today};for(const d of Object.values(result)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw new Error("invalid_period");}if(result.from>result.to)throw new Error("invalid_period");return result;}
export type AgencyPeriod=ReturnType<typeof agencyPeriod>;
export const CASH_CATEGORIES={commission:"Recebimento de comissão",other_income:"Outra receita",rent:"Renda e instalações",utilities:"Água, luz e telecomunicações",marketing:"Marketing e publicidade",software:"Software e serviços",legal:"Serviços jurídicos e contabilidade",travel:"Deslocações",other_expense:"Outra despesa"} as const;
export interface AgencyProducer{id:string;name:string;commissionBase:number;agentGross:number;agencyGross:number;royalties:number;royaltiesAgency:number;pension:number;agentNet:number;}
export interface AgencyClosure{id:string;deal_id:string;agency_id:string;property_reference:string;closed_at:string;gross:number;retained:number;royalties_agent:number;royalties_agency:number;pension_total:number;broker_pension_total:number;agency_net:number;snapshot:{financials:{producers:AgencyProducer[]};overrides?:{amount:number}[]};}
export interface AgencyCash{id:string;kind:"income"|"expense";entry_date:string;category:string;description:string;amount:number;deal_id:string|null;voided_at:string|null;created_at:string;createdBy?:string;}
export function agencyTotals(closures:AgencyClosure[],adjustments:{closure_id:string;amount:number}[],cash:AgencyCash[],payments:{amount:number;status:string}[]){
 const cents=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 const adjustment=new Map(adjustments.map(a=>[a.closure_id,Number(a.amount)]));
 const producerRows=closures.flatMap(c=>c.snapshot.financials.producers);
 const expense=cents(cash.filter(c=>c.kind==="expense"&&!c.voided_at).reduce((n,c)=>n+Number(c.amount),0));
 const income=cents(cash.filter(c=>c.kind==="income"&&!c.voided_at).reduce((n,c)=>n+Number(c.amount),0));
 const agencyNet=cents(closures.reduce((n,c)=>n+Number(c.agency_net)-(adjustment.get(c.id)||0),0));
 const paid=cents(payments.filter(p=>p.status==="pago").reduce((n,p)=>n+Number(p.amount),0));
 return {deals:closures.length,gross:cents(closures.reduce((n,c)=>n+Number(c.gross),0)),agencyGross:cents(producerRows.reduce((n,p)=>n+Number(p.agencyGross),0)),royaltiesAgency:cents(closures.reduce((n,c)=>n+Number(c.royalties_agency),0)),pensionAgent:cents(closures.reduce((n,c)=>n+Number(c.pension_total),0)),pensionBroker:cents(closures.reduce((n,c)=>n+Number(c.broker_pension_total)+(adjustment.get(c.id)||0),0)),agencyNet,expense,income,paid,result:cents(agencyNet-expense),cashFlow:cents(income-expense-paid)};
}
