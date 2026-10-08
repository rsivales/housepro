import { describe, expect, it } from "vitest";
import { buildFeed, descriptions, eligible, TEST_CUSTOMER_CODE, validateFeed, type Listing } from "./feed";
import { payloadHash } from "./server";
const p: Listing={id:"11111111-1111-4111-8111-111111111111",reference:"HP0001-01",legacy_reference:"OLD-1",title:"Apartamento",type:"Apartamento",operation:"venda",price:300000,area:100,beds:2,baths:2,latitude:37.02,longitude:-7.92,approval:"aprovado",listing_state:"activo",off_market:false,status:"novo",energy:"B-",description:"Apartamento em Faro.",cover_url:"https://media.example/casa.jpg",gallery:["https://media.example/casa.jpg","https://media.example/interior.png"],municipality:"Faro",is_development:false,agent:{name:"Rodrigo Silva",email:"helix.housepro@gmail.com",whatsapp:"351967178288",agency_id:"agency"}};
const cfg={customer_code:TEST_CUSTOMER_CODE,property_ids:[p.id],overrides:{},development_service:false};
describe("idealista JSON V6 — official schemas and mass-feed semantics",()=>{
 it("separates explicit language headings and respects the vendor's 4000-character limit",()=>{
  const result=descriptions('Casa portuguesa.\n____________\nENGLISH:\n'+ 'English description. '.repeat(300)+'\nFRANÇAIS:\nMaison française.');
  expect(result.map(d=>d.descriptionLanguage)).toEqual(['portuguese','english','french']);expect(result[0].descriptionText).toBe('Casa portuguesa.');expect(result[1].descriptionText.length).toBeLessThanOrEqual(4000);expect(result[2].descriptionText).toBe('Maison française.');
 });
 it("validates a Portuguese listing against the vendor schemas with real photo URLs",()=>{
  const feed=buildFeed([p],cfg);expect(feed.schemaErrors).toEqual([]);expect(feed.problems).toEqual([]);expect(feed.payload.customerProperties[0].propertyFeatures.featuresType).toBe("flat");expect(feed.payload.customerProperties[0].propertyImages).toHaveLength(2);expect(feed.payload.customerProperties[0].propertyReference).toBe("OLD-1");
 });
 it.each(["reservado","cpcv","vendido"])("excludes %s and keeps non-selected properties out",status=>{expect(eligible({...p,status})).toBe(false);expect(buildFeed([{...p,status}],cfg).count).toBe(0);expect(buildFeed([p],{...cfg,property_ids:[]}).count).toBe(0);});
 it("never repairs missing areas or bathrooms with fictional values",()=>{
  const feed=buildFeed([{...p,area:0,baths:0}],cfg);expect(feed.problems[0].errors).toContain("Área construída em falta (m² inteiros)");expect(feed.payload.customerProperties).toEqual([]);
 });
 it("allows an explicit verified area override without changing the listing",()=>{const feed=buildFeed([{...p,area:0}],{...cfg,overrides:{[p.id]:{area:105}}});expect(feed.problems).toEqual([]);expect(feed.payload.customerProperties[0].propertyFeatures.featuresAreaConstructed).toBe(105);});
 it("supports new developments only with the corresponding service, without invented units",()=>{
  const dev={...p,is_development:true,development_name:"Jardins",development_stage:"construcao"};
  expect(buildFeed([dev],cfg).problems[0].errors).toContain("Serviço de empreendimentos do idealista não confirmado");
  const feed=buildFeed([dev],{...cfg,development_service:true});expect(feed.schemaErrors).toEqual([]);expect(feed.payload.customerProperties).toEqual([]);expect(feed.payload.customerNewDevelopments).toHaveLength(1);
 });
 it("does not expose seller data, private files or fake videos",()=>{
  const feed=buildFeed([{...p,owner_nif:"private",documents_meta:[{url:"secret"}]} as Listing],cfg);expect(JSON.stringify(feed.payload)).not.toContain("private");expect(JSON.stringify(feed.payload)).not.toContain("secret");expect(feed.payload.customerProperties[0]).not.toHaveProperty("propertyVideos");
 });
 it("detects content changes but ignores source row order",()=>{
  const other={...p,id:"22222222-2222-4222-8222-222222222222",reference:"SECOND"};const c={...cfg,property_ids:[p.id,other.id]};
  expect(payloadHash(buildFeed([p,other],c).payload)).toBe(payloadHash(buildFeed([other,p],c).payload));
  expect(payloadHash(buildFeed([{...p,price:299000}],cfg).payload)).not.toBe(payloadHash(buildFeed([p],cfg).payload));
 });
 it("rejects invalid customer codes using the official feedkey rule",()=>{expect(validateFeed({...buildFeed([p],cfg).payload,customerCode:"missing"}).length).toBeGreaterThan(0);});
});
