import { expect,it } from "vitest";
import { EMPTY_ACTIVITY,parseActivityText,validateActivity } from "./model";

it("extracts labelled client and proposal details while leaving confirmation and sharing to the agent",()=>{
 const result=parseActivityText("PROPOSTA DE COMPRA\nNome: Agente Externo\nCliente: Ana Cliente\nEmail do cliente: ana@example.test\nTelefone: +351 912345678\nValor da proposta: 175.000,50 €\nSinal: 10000\nOrigem: Idealista\nFinanciamento: Crédito\nConsultor: Pedro\nAgência: Parceira\nValidade: 30/11/2026");
 expect(result).toMatchObject({kind:"proposal",name:"Ana Cliente",email:"ana@example.test",amount:175000.5,deposit:10000,source:"portal",financing:"credito",validUntil:"2026-11-30",participants:[{name:"Pedro",agency:"Parceira"}]});
 expect(result).not.toHaveProperty("confirmed");
 expect(result).not.toHaveProperty("shareOwner");
});
it.each([["175000.50",175000.5],["175,000.50",175000.5],["175.000",175000],["175,000",undefined]])("handles monetary formats without inflating decimal prices %s",(text,amount)=>{
 expect(parseActivityText("Valor da proposta: "+text).amount).toBe(amount);
});
it("preserves unknown times and origins instead of treating them as known",()=>{
 const result=parseActivityText("FICHA DE VISITA\nData da visita: 10/11/2026\nFeedback: Gostou da sala\nObservação: Viu um anúncio no Facebook");
 expect(result.timeKnown).toBe(false);
 expect(result.occurredAt).toBeTruthy();
 expect(result.source).toBeUndefined();
});
it("keeps a multi-line client comment and offer conditions without absorbing later fields",()=>{
 const result=parseActivityText("FICHA DE VISITA\nCliente: Ana\nFeedback: Gostou da sala\nQuer visitar novamente com a família\n\nOrigem: Facebook\nCondições: Sujeito a financiamento\nEscritura até dezembro\nSinal: 10000");
 expect(result.feedback).toBe("Gostou da sala\nQuer visitar novamente com a família");
 expect(result.conditions).toBe("Sujeito a financiamento\nEscritura até dezembro");
 expect(result.deposit).toBe(10000);
});
it("requires review and a valid phone for a CRM pipeline, and validates the public summary",()=>{
 const base={...EMPTY_ACTIVITY,name:"Cliente",phone:"912345678",occurredAt:"2026-11-01T12:00:00.000Z"};
 expect(()=>validateActivity(base)).toThrow();
 expect(()=>validateActivity({...base,confirmed:true,shareOwner:true})).toThrow();
 expect(validateActivity({...base,confirmed:true,shareOwner:true,ownerFeedback:"Gostou da luminosidade."})).toMatchObject({phone:"912345678",confirmed:true});
 expect(()=>validateActivity({...base,confirmed:true,phone:""})).toThrow();
});
it("checks offer values and optional dates",()=>{
 const base={...EMPTY_ACTIVITY,kind:"proposal",name:"Cliente",phone:"912345678",occurredAt:"2026-11-01T12:00:00.000Z",confirmed:true,amount:175000};
 expect(validateActivity(base).amount).toBe(175000);
 expect(()=>validateActivity({...base,deposit:200000})).toThrow();
 expect(()=>validateActivity({...base,validUntil:"2026-02-31"})).toThrow();
 expect(()=>validateActivity({...base,amount:1e10})).toThrow();
});
