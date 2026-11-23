import { normalizeContactPhone } from "@/lib/phone";
export const ACTIVITY_SOURCES = {unknown:"Origem por confirmar",site:"Website",portal:"Portal imobiliário",facebook:"Facebook / Instagram",whatsapp:"WhatsApp",consultor:"Consultor / recomendação"} as const;
export interface ActivityParticipant {
  name:string; role:string; agency:string; phone:string; email:string; profileId:string;
}
export interface ActivityInput {
  kind:"visit"|"proposal"; name:string; phone:string; email:string; nif:string; address:string;
  occurredAt:string; timeKnown:boolean; source:keyof typeof ACTIVITY_SOURCES; originDetail:string;
  feedback:string; sentiment:"positive"|"neutral"|"negative"|"unspecified"; rating:number|null;
  ownerFeedback:string; shareOwner:boolean;
  amount:number|null; deposit:number|null; financing:string; conditions:string; validUntil:string; closingDate:string;
  participants:ActivityParticipant[]; buyerAgentId:string;
  pipeline:string; stage:number; rawText:string; confirmed:boolean;
}
export const EMPTY_ACTIVITY:ActivityInput = {
  kind:"visit",name:"",phone:"",email:"",nif:"",address:"",occurredAt:"",timeKnown:false,
  source:"unknown",originDetail:"",feedback:"",sentiment:"unspecified",rating:null,
  ownerFeedback:"",shareOwner:false,amount:null,deposit:null,financing:"por_definir",conditions:"",validUntil:"",closingDate:"",
  participants:[],buyerAgentId:"",pipeline:"compradores",stage:2,rawText:"",confirmed:false,
};
const text=(v:unknown,max:number)=>{if(typeof v!=="string"||v.length>max)throw new Error("Verifique o tamanho dos campos.");return v.trim();};
const optionalEmail=(v:string)=>!v||/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
const day=(v:string)=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validateActivity(value:unknown):ActivityInput {
  if(!value||typeof value!=="object")throw new Error("Ficha inválida.");
  const b=value as Record<string,unknown>;
  const result:ActivityInput={
    kind:b.kind as ActivityInput["kind"],
    name:text(b.name,160),phone:text(b.phone,40),email:text(b.email,254).toLowerCase(),nif:text(b.nif,40),address:text(b.address,500),
    occurredAt:text(b.occurredAt,40),timeKnown:b.timeKnown===true,source:b.source as ActivityInput["source"],originDetail:text(b.originDetail,250),
    feedback:text(b.feedback,6000),sentiment:b.sentiment as ActivityInput["sentiment"],rating:b.rating as number|null,
    ownerFeedback:text(b.ownerFeedback,2000),shareOwner:b.shareOwner as boolean,
    amount:b.amount as number|null,deposit:b.deposit as number|null,financing:text(b.financing,50),conditions:text(b.conditions,6000),
    validUntil:text(b.validUntil,10),closingDate:text(b.closingDate,10),
    participants:[],buyerAgentId:text(b.buyerAgentId,36),pipeline:text(b.pipeline,60),stage:b.stage as number,
    rawText:text(b.rawText,50000),confirmed:b.confirmed===true,
  };
  const phone=/^[+\d\s().-]+$/.test(result.phone)?normalizeContactPhone(result.phone):null;
  if(!["visit","proposal"].includes(result.kind)||!result.name||(!phone&&!result.email)||!optionalEmail(result.email))throw new Error("Confirme o tipo de ficha, nome e pelo menos um contacto válido (telefone ou email) do cliente.");
  result.phone=phone??"";
  if(!Number.isFinite(Date.parse(result.occurredAt))||new Date(result.occurredAt).toISOString()!==result.occurredAt||
    result.occurredAt<"2000"||Date.parse(result.occurredAt)>Date.now()+300000)throw new Error("Confirme a data e hora da ficha.");
  if(!Object.hasOwn(ACTIVITY_SOURCES,result.source)||!["positive","neutral","negative","unspecified"].includes(result.sentiment)||
    (result.rating!==null&&(!Number.isInteger(result.rating)||result.rating<1||result.rating>5)))throw new Error("Confirme a origem e a avaliação do imóvel.");
  if(typeof result.shareOwner!=="boolean"||result.shareOwner&&!result.ownerFeedback)throw new Error("Escreva o resumo a partilhar com o proprietário.");
  if(result.kind==="proposal"&&(!Number.isFinite(result.amount)||result.amount!<=0||result.amount!>=1e10))throw new Error("Indique o valor da proposta.");
  if(result.deposit!==null&&(!Number.isFinite(result.deposit)||result.deposit<0||result.deposit>(result.amount??0)))throw new Error("Verifique o sinal da proposta.");
  if(!day(result.validUntil)||!day(result.closingDate)||!["por_definir","credito","capitais_proprios","misto"].includes(result.financing))throw new Error("Verifique as condições e datas da proposta.");
  if(!Array.isArray(b.participants)||b.participants.length>12)throw new Error("Verifique os agentes envolvidos.");
  result.participants=b.participants.map((p:Record<string,unknown>)=>({
    name:text(p.name,160),role:text(p.role,80),agency:text(p.agency,200),
    email:text(p.email,254),phone:text(p.phone,40),profileId:text(p.profileId,36),
  }));
  if(result.participants.some(p=>!p.name||!p.role||!optionalEmail(p.email)))throw new Error("Indique o nome e o papel dos agentes envolvidos.");
  if(!result.confirmed||!Number.isInteger(result.stage)||result.stage<0)throw new Error("Reveja a ficha e confirme os dados antes de gravar.");
  return result;
}
function amount(value:string|undefined) {
  if(!value)return undefined;
  const clean=value.replace(/€|EUR|euros/gi,"").replace(/\s/g,"");
  let normalized:string;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(clean)) normalized=clean.replace(/\./g,"").replace(",",".");
  else if (/^\d+(?:,\d{1,2})?$/.test(clean)) normalized=clean.replace(",",".");
  else if (/^\d+(?:\.\d{1,2})?$/.test(clean)) normalized=clean;
  else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(clean)) normalized=clean.replace(/,/g,"");
  else return undefined;
  const n=Number(normalized);
  return n>0&&n<=1e10?n:undefined;
}
/** Labelled suggestions remain editable. Names and email addresses belonging to agents are never guessed as the buyer. */
export function parseActivityText(text:string):Partial<ActivityInput> {
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const labelled=(labels:string)=>{
    const label=new RegExp(`^(?:${labels})[ \\t]*(?:[:=]|[—–-])[ \\t]*(.*)$`,"i");
    const alone=new RegExp(`^(?:${labels})[ \\t]*:?$`,"i");
    for(let i=0;i<lines.length;i++){
      const match=lines[i].match(label);
      if(match?.[1]?.trim())return match[1].trim();
      if((match||alone.test(lines[i]))&&lines[i+1]&&!/^[^:;]{2,55}\s*[:=]/.test(lines[i+1]))return lines[i+1];
    }
    return undefined;
  };
  const block=(labels:string)=>{
    const start=lines.findIndex(line=>new RegExp(`^(?:${labels})[ \\t]*(?:[:=]|[—–-])`,"i").test(line));
    if(start<0)return undefined;
    const first=lines[start].replace(new RegExp(`^(?:${labels})[ \\t]*(?:[:=]|[—–-])[ \\t]*`,"i"),"").trim();
    const values=first?[first]:[];
    for(const line of lines.slice(start+1)){
      if(/^[^:;]{2,55}\s*[:=]/.test(line)||/^(?:assinatura|declaração|anexo|termos)\b/i.test(line.trim()))break;
      values.push(line.trim());
    }
    return values.join("\n").trim()||undefined;
  };
  const result:Partial<ActivityInput>={rawText:text.slice(0,50000)};
  const fields:Record<string,keyof ActivityInput>={
    "nome(?: do cliente| completo| e apelido)?|cliente|comprador|visitante":"name","telefone(?: do cliente)?|telem[oó]vel(?: do cliente)?|contacto(?: telef[oó]nico)?|tel\\.?":"phone",
    "e-?mail(?: do cliente)?|correio eletr[oó]nico":"email","nif(?: do cliente)?|contribuinte":"nif","morada(?: do cliente)?":"address",
    "feedback|opini[aã]o(?: do cliente)?|observa[cç][oõ]es(?: do cliente)?|coment[aá]rios(?: do cliente)?":"feedback","condi[cç][oõ]es(?: da proposta)?":"conditions",
    "origem(?: do cliente)?|como nos conheceu":"originDetail",
  };
  for(const [labels,key] of Object.entries(fields)){
    const value=key==="feedback"||key==="conditions"?block(labels):labelled(labels);
    if(value)Object.assign(result,{[key]:value});
  }
  const price=amount(labelled("valor(?: da proposta)?|pre[cç]o proposto|proposta"));
  if(price)result.amount=price;
  const deposit=amount(labelled("sinal|dep[oó]sito"));
  if(deposit)result.deposit=deposit;
  const date=labelled("data(?: da visita| da proposta)?|dia da visita");
  const match=date?.match(/^(\d{2})[/-](\d{2})[/-](\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if(match) {
    const isoDate=`${match[3]}-${match[2]}-${match[1]}`;
    const d=new Date(`${isoDate}T${match[4]??"12"}:${match[5]??"00"}`);
    if(Number.isFinite(d.getTime())&&d.getDate()===Number(match[1])&&d.getMonth()+1===Number(match[2])){
      result.occurredAt=d.toISOString();result.timeKnown=Boolean(match[4]);
    }
  }
  const explicitName=labelled("nome do cliente|cliente|comprador|visitante");
  const explicitEmail=labelled("e-?mail do cliente|e-?mail do comprador");
  if(explicitName)result.name=explicitName;
  if(explicitEmail)result.email=explicitEmail;
  const dateOnly=(value:string|undefined)=>{
    const parts=value?.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if(!parts)return undefined;
    const iso=`${parts[3]}-${parts[2]}-${parts[1]}`;
    return Number.isFinite(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso?iso:undefined;
  };
  const validUntil=dateOnly(labelled("validade(?: da proposta)?|v[aá]lida at[eé]"));
  const closingDate=dateOnly(labelled("escritura(?: pretendida)?|data da escritura"));
  if(validUntil)result.validUntil=validUntil;
  if(closingDate)result.closingDate=closingDate;
  const origin=labelled("origem(?: do cliente)?|como nos conheceu");
  if(origin){
    if(/^(facebook|instagram|meta)$/i.test(origin))result.source="facebook";
    else if(/^(idealista|supercasa|portal)$/i.test(origin))result.source="portal";
    else if(/^(site|website|housepro)$/i.test(origin))result.source="site";
    else if(/^whatsapp$/i.test(origin))result.source="whatsapp";
    else if(/^(consultor|recomenda[cç][aã]o)$/i.test(origin))result.source="consultor";
  }
  const rating=labelled("pontua[cç][aã]o|classifica[cç][aã]o");
  if(rating&&/^[1-5](?:\s*\/\s*5)?$/.test(rating))result.rating=parseInt(rating);
  const sentiment=labelled("avalia[cç][aã]o(?: do cliente)?");
  if(sentiment&&/^(positiv[ao]|negativ[ao]|neutr[ao])$/i.test(sentiment))result.sentiment=/^posit/i.test(sentiment)?"positive":/^negat/i.test(sentiment)?"negative":"neutral";
  const financing=labelled("financiamento|forma de pagamento");
  if(financing&&/^(cr[eé]dito|capitais pr[oó]prios|misto)$/i.test(financing))result.financing=/^cr/i.test(financing)?"credito":/^cap/i.test(financing)?"capitais_proprios":"misto";
  if(/(?:^|\n)\s*proposta de (?:compra|aquisi[cç][aã]o)\s*(?:\n|$)/i.test(text)){result.kind="proposal";result.stage=3;}
  else if(/(?:^|\n)\s*ficha de visita\s*(?:\n|$)/i.test(text)){result.kind="visit";result.stage=2;}
  const agent=labelled("consultor(?: do comprador| respons[aá]vel)?|agente(?: imobili[aá]rio)?");
  if(agent)result.participants=[{name:agent,role:"Consultor indicado na ficha",agency:labelled("ag[eê]ncia|imobili[aá]ria")??"",phone:"",email:"",profileId:""}];
  return result;
}
