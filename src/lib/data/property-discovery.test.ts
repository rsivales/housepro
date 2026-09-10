import { describe, expect, it } from "vitest";
import type { Property } from "@/lib/data/types";
import { propertyQuality, propertyScores, selectGeneralHero, selectMunicipalityWinner } from "./property-discovery";

const property=(id:string,municipality:string,agencyId:string,extra:Partial<Property>={}):Property=>({id,reference:id,title:`Casa ${id}`,operation:"venda",type:"Moradia",typology:"T3",price:500000,area:200,beds:3,baths:2,parish:"Centro",municipality,energy:"A",status:"novo",image:`/${id}.jpg`,gallery:Array(9).fill(`/${id}.jpg`),description:"x".repeat(320),shortDescription:"Resumo completo da propriedade para apresentação pública.",documents:["a","b","c","d","e"],approval:"aprovado",agentId:agencyId,agent:{id:`agent-${agencyId}`,name:"Agente",role:"agente",agency:agencyId,agencyId,whatsapp:"",accent:"blue"},listedAt:"2026-01-01",...extra});

describe("descoberta de imóveis",()=>{
 it("calcula qualidade e explica o que falta",()=>{const complete=propertyQuality(property("1","Faro","a"));expect(complete.score).toBeGreaterThan(85);expect(propertyQuality({...property("2","Faro","a"),image:"",gallery:[]}).missing).toContain("Fotografia principal")});
 it("usa pontuação neutra sem três comparáveis",()=>{const scores=propertyScores([property("1","Faro","a"),property("2","Faro","a")]);expect(scores.get("1")?.priceMarket).toBe(50)});
 it("roda diariamente entre agências e reinicia o ciclo",()=>{const list=[property("1","Faro","a"),property("2","Faro","b")];const cfg={startDate:"2026-01-01",agencyOrder:["a","b"]};expect(selectMunicipalityWinner(list,"Faro",cfg,new Date("2026-01-01T12:00:00Z"))?.id).toBe("1");expect(selectMunicipalityWinner(list,"Faro",cfg,new Date("2026-01-02T12:00:00Z"))?.id).toBe("2");expect(selectMunicipalityWinner(list,"Faro",cfg,new Date("2026-01-03T12:00:00Z"))?.id).toBe("1")});
 it("salta agência sem imóveis elegíveis",()=>{expect(selectMunicipalityWinner([property("2","Faro","b")],"Faro",{agencyOrder:["a","b"],startDate:"2026-01-01"},new Date("2026-01-01T12:00:00Z"))?.id).toBe("2")});
 it("alterna o hero entre concelhos",()=>{const list=[property("1","Faro","a"),property("2","Loulé","b")];const first=selectGeneralHero(list,{municipalityOrder:["Faro","Loulé"],startDate:"2026-01-01"},new Date("2026-01-01T12:00:00Z"));const next=selectGeneralHero(list,{municipalityOrder:["Faro","Loulé"],startDate:"2026-01-01"},new Date("2026-01-02T12:00:00Z"));expect(first?.municipality).not.toBe(next?.municipality)});
});
