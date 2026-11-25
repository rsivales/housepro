import { operationalLead } from "./identity";
import type {Lead} from "@/lib/data/leads";
export const FOLLOWUP_ACTIONS={contactado:"Contacto realizado",tentativa:"Tentativa sem resposta",aguarda_cliente:"Aguarda resposta do cliente",acompanhamento:"Acompanhamento agendado",encerrado:"Encerrar acompanhamento"} as const;
export function leadHasContact(l:Pick<Lead,"contact"|"email">){return operationalLead(l);}
export function firstActionNeeded(l:Lead){return leadHasContact(l)&&l.status==="novo"&&!l.contactedAt&&!l.lastFollowupAt&&l.followupState!=="encerrado";}
export function followupDue(l:Lead,now=new Date()){return leadHasContact(l)&&l.followupState!=="encerrado"&&!["perdido","convertido"].includes(l.status)&&Boolean(l.nextFollowupAt&&Date.parse(l.nextFollowupAt)<=now.getTime());}
export function validateFollowup(v:unknown){
 const b=v as Record<string,unknown>|null;
 if(!b||typeof b.action!=="string"||!(b.action in FOLLOWUP_ACTIONS)||typeof b.note!=="string"||b.note.trim().length<5||b.note.length>3000||typeof b.requestId!=="string"||!/^[0-9a-f-]{36}$/i.test(b.requestId))throw new Error("Indique o resultado e uma nota com pelo menos 5 caracteres.");
 if(b.action!=="encerrado"&&(!b.nextAt||typeof b.nextAt!=="string"||!Number.isFinite(Date.parse(b.nextAt))||Date.parse(b.nextAt)<Date.now()+60000||Date.parse(b.nextAt)>Date.now()+90*86400000))throw new Error("Agende o próximo acompanhamento, entre 1 minuto e 90 dias.");
 return {action:b.action,note:b.note.trim(),requestId:b.requestId,nextAt:b.action==="encerrado"?null:new Date(String(b.nextAt)).toISOString()};
}
