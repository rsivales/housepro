import { expect,it } from "vitest";
import { parseBuyerOcr } from "./ocr";
it("extracts labelled buyer data without changing consent or private identifiers",()=>{expect(parseBuyerOcr("Nome: Ana Teste\nTelefone: 912 345 678\nEmail: ana@example.org\nZona: Faro, Olhão\nOrçamento máximo: 350.000 €\nTipologias: T2, T3\nPrazo: 3 meses\nNIF: 123456789\nConsentimento: sim")).toEqual({name:"Ana Teste",phone:"912345678",email:"ana@example.org",zone:"Faro, Olhão",buyerProfile:{zones:["Faro","Olhão"],budgetMax:350000,typologies:["T2","T3"],timeframeMonths:3}});});
it("does not invent values from an ambiguous budget, urgency or loose handwriting",()=>{expect(parseBuyerOcr("Orçamento: 200.000 a 400.000\nPrazo: talvez breve\nUrgente comprar e vender")).toEqual({});});
