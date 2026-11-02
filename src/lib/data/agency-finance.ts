import type {Agent} from "./types";
import {isNetworkFinanceAdmin} from "./finance-access";
export function canReadAgencyFinance(agent:Pick<Agent,"id"|"agencyId"|"roleKey"|"role">,agencyId:string,brokerId?:string|null){return isNetworkFinanceAdmin(agent)||brokerId===agent.id||(agent.roleKey==="diretor"&&agent.agencyId===agencyId);}
export const dayInLisbon=(date:Date|string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(date));
export function agencyPeriod(from?:string,to?:string){const today=dayInLisbon(new Date());const result={from:from||`${today.slice(0,4)}-01-01`,to:to||today};for(const d of Object.values(result)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw new Error("invalid_period");}if(result.from>result.to)throw new Error("invalid_period");return result;}
export type AgencyPeriod=ReturnType<typeof agencyPeriod>;
export const CASH_CATEGORIES={
 commission:"Recebimento de comissão imobiliária",credit_receipt:"Recebimento de crédito",certificate_receipt:"Recebimento de certificados",partner_receipt:"Recebimento de parcerias",other_income:"Outra receita",
 rent:"Renda e instalações",utilities:"Água, luz e energia",telecom:"Telecomunicações (NOS e outros)",portals:"Portais imobiliários e anunciantes",marketing:"Marketing e publicidade",software:"Software e serviços",payroll:"Salários e honorários",social_security:"Segurança social",insurance:"Seguros",legal:"Contabilidade e serviços jurídicos",maintenance:"Limpeza e manutenção",travel:"Deslocações e viaturas",taxes:"Taxas e licenças",other_expense:"Outra despesa",
} as const;
export const CASH_INCOME_CATEGORIES=["commission","credit_receipt","certificate_receipt","partner_receipt","other_income"] as const;
export interface AgencyProducer{id:string;name:string;commissionBase:number;agentGross:number;agencyGross:number;royalties:number;royaltiesAgency:number;pension:number;agentNet:number;}
export interface AgencyClosure{id:string;deal_id:string;agency_id:string;property_reference:string;closed_at:string;gross:number;retained:number;royalties_agent:number;royalties_agency:number;pension_total:number;broker_pension_total:number;agency_net:number;snapshot:{financials:{producers:AgencyProducer[]};overrides?:{amount:number}[]};}
export interface AgencyCash{id:string;kind:"income"|"expense";entry_date:string;category:string;description:string;amount:number;deal_id:string|null;voided_at:string|null;created_at:string;createdBy?:string;planned?:boolean;recurring_series_id?:string|null;}
export function agencyTotals(closures:AgencyClosure[],adjustments:{closure_id:string;amount:number}[],cash:AgencyCash[],payments:{amount:number;status:string}[],otherIncome:{status:string;gross_amount:number;consultant_amount:number|null;agency_amount:number|null}[]=[],paidOtherIncome:{consultant_amount:number|null}[]=[]){
 const cents=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 const adjustment=new Map(adjustments.map(a=>[a.closure_id,Number(a.amount)]));
 const producerRows=closures.flatMap(c=>c.snapshot.financials.producers);
 const expense=cents(cash.filter(c=>c.kind==="expense"&&!c.voided_at).reduce((n,c)=>n+Number(c.amount),0));
 const expensePaid=cents(cash.filter(c=>c.kind==="expense"&&!c.voided_at&&!c.planned).reduce((n,c)=>n+Number(c.amount),0));
 const income=cents(cash.filter(c=>c.kind==="income"&&!c.voided_at).reduce((n,c)=>n+Number(c.amount),0));
 const agencyNet=cents(closures.reduce((n,c)=>n+Number(c.agency_net)-(adjustment.get(c.id)||0),0));
 const paid=cents(payments.filter(p=>p.status==="pago").reduce((n,p)=>n+Number(p.amount),0));
 const validated=otherIncome.filter(r=>r.status==="aprovado"||r.status==="pago");
 const otherGross=cents(validated.reduce((n,r)=>n+Number(r.gross_amount),0));
 const otherConsultant=cents(validated.reduce((n,r)=>n+Number(r.consultant_amount),0));
 const otherAgency=cents(validated.reduce((n,r)=>n+Number(r.agency_amount),0));
 const otherPaid=cents(paidOtherIncome.reduce((n,r)=>n+Number(r.consultant_amount),0));
 return {deals:closures.length,gross:cents(closures.reduce((n,c)=>n+Number(c.gross),0)),agencyGross:cents(producerRows.reduce((n,p)=>n+Number(p.agencyGross),0)),royaltiesAgency:cents(closures.reduce((n,c)=>n+Number(c.royalties_agency),0)),pensionAgent:cents(closures.reduce((n,c)=>n+Number(c.pension_total),0)),pensionBroker:cents(closures.reduce((n,c)=>n+Number(c.broker_pension_total)+(adjustment.get(c.id)||0),0)),agencyNet,otherGross,otherConsultant,otherAgency,otherPaid,expense,expensePaid,income,paid,result:cents(agencyNet+otherAgency-expense),cashFlow:cents(income-expensePaid-paid-otherPaid)};
}
