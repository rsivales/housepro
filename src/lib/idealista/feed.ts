import Ajv from "ajv-draft-04";
import addFormats from "ajv-formats";
import schemas from "./schema-bundle.json";

export type Listing = {
 id: string; reference: string; legacy_reference?: string | null; title: string; type: string; operation: string;
 price: number | string; area: number; area_util?: number | string | null; land_area?: number | string | null;
 typology?: string | null; beds: number; baths: number; latitude: number | null; longitude: number | null;
 approval: string; listing_state: string; off_market: boolean; status: string | null;
 energy: string; description: string | null; cover_url: string | null; gallery: string[] | null;
 municipality: string; is_development: boolean; development_name?: string | null; development_stage?: string | null;
 garage?: boolean | null; elevator?: boolean | null; accessible?: boolean | null; construction_year?: number | null;
 equipment?: string[] | null; amenities?: string[] | null; location_privacy?: string | null;
 agent?: {name: string; email?: string | null; whatsapp?: string | null; agency_id: string} | null;
};
export type Override = { reference?: string; area?: number; bedrooms?: number; propertyCode?: string };
export type FeedConfig = { customer_code: string; property_ids: string[]; overrides: Record<string, Override>; development_service: boolean };
export const TEST_CUSTOMER_CODE = "ilc1234567890123456789012345678901234567890";
const TYPES: Record<string,string> = { Apartamento:"flat", Moradia:"house", Terreno:"land", Loja:"premises", Escritório:"office", Armazém:"premises_industrial", Prédio:"building", Garagem:"garage", Arrecadação:"storage", Quinta:"rustic_quinta" };
const ajv = new Ajv({ strict:false, allErrors:true, schemas });
addFormats(ajv);
const validate = ajv.getSchema("https://feeds.idealista.com/v6/schemas/properties/customer.json")!;
export function validateFeed(payload: unknown): string[] {
 return validate(payload) ? [] : (validate.errors ?? []).slice(0,20).map(e => `${e.instancePath || "/"}: ${e.message}`);
}
export function eligible(p: Listing) { return p.approval === "aprovado" && p.listing_state === "activo" && !p.off_market && !["reservado","cpcv","vendido"].includes(p.status ?? ""); }
export function listingProblems(p: Listing, override: Override = {}): string[] {
 const errors: string[] = [];
 const type = TYPES[p.type];
 if (!type) errors.push(`Tipo não suportado: ${p.type}`);
 if (!["venda","arrendamento"].includes(p.operation)) errors.push("Operação não suportada");
 if (!Number.isInteger(Number(p.price)) || Number(p.price) < 1) errors.push("Preço obrigatório em euros inteiros");
 const area = type === "land" ? Number(p.land_area || p.area) : Number(override.area ?? p.area);
 if (!Number.isInteger(area) || area < 1) errors.push(type === "land" ? "Área do terreno em falta" : "Área construída em falta (m² inteiros)");
 if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || Math.abs(p.latitude!) > 90 || Math.abs(p.longitude!) > 180) errors.push("Coordenadas em falta ou inválidas");
 if (["flat","house","rustic_quinta"].includes(type)) {
  const bedrooms = override.bedrooms ?? p.beds;
  if (!Number.isInteger(bedrooms) || bedrooms < 0) errors.push("Número de quartos inválido");
  const stated = /^T([0-9]+)/i.exec(p.typology || "");
  if (stated && Number(stated[1]) !== bedrooms) errors.push(`Quartos (${bedrooms}) não correspondem à tipologia ${p.typology}; confirme o valor`);
  if (!Number.isInteger(p.baths) || p.baths < 1) errors.push("Número de casas de banho em falta");
 }
 if (type === "garage") errors.push("Garagem: é necessário mapear a capacidade no formato do idealista antes de exportar");
 if (!p.description?.trim()) errors.push("Descrição em falta");
 if (!photos(p).length) errors.push("Sem fotografias JPG/PNG/GIF públicas");
 if (p.is_development && !p.development_name?.trim()) errors.push("Nome do empreendimento em falta");
 if (p.is_development && !["flat","house","premises","office"].includes(type)) errors.push("Tipologia do empreendimento não suportada");
 return errors;
}
function photos(p: Listing) {
 return [...new Set([p.cover_url,...(p.gallery ?? [])].filter((u):u is string=>typeof u === "string" && /^https?:\/\/[^\s]+\.(jpe?g|png|gif)(\?.*)?$/i.test(u)))].slice(0,200);
}
/** Preserve explicit language sections from CRM imports; do not guess translations. */
export function descriptions(text: string) {
 const languages: Record<string,string> = {PORTUGUÊS:"portuguese",PORTUGUES:"portuguese",PORTUGUESE:"portuguese",ENGLISH:"english",INGLÊS:"english",FRANÇAIS:"french",FRENCH:"french",FRANCÊS:"french",ESPAÑOL:"spanish",SPANISH:"spanish",DEUTSCH:"german",GERMAN:"german"};
 const sections = new Map<string,string[]>();
 const headings = /^(PORTUGUÊS|PORTUGUES|PORTUGUESE|ENGLISH|INGLÊS|FRANÇAIS|FRENCH|FRANCÊS|ESPAÑOL|SPANISH|DEUTSCH|GERMAN)\s*:\s*$/gmi;
 let start=0; let language="portuguese";
 function append(end:number) { const value=text.slice(start,end).replace(/^\s*[_—-]{3,}\s*$|\s*[_—-]{3,}\s*$/gm,"").trim(); if(value) sections.set(language,[...(sections.get(language)??[]),value]); }
 for(const match of text.matchAll(headings)) { append(match.index!);language=languages[match[1].toUpperCase()];start=match.index!+match[0].length; }
 append(text.length);
 return [...sections].map(([descriptionLanguage,parts])=>{
  const full=parts.join("\n\n");
  if(full.length<=4000)return {descriptionLanguage,descriptionText:full};
  const fragment=full.slice(0,3999);const paragraph=fragment.lastIndexOf("\n\n");const boundary=paragraph>=3000?paragraph:fragment.lastIndexOf(" ");
  return {descriptionLanguage,descriptionText:fragment.slice(0,boundary>0?boundary:3999).trimEnd()+"…"};
 });
}
function mapListing(p: Listing, override: Override = {}) {
 const type = TYPES[p.type];
 const features: Record<string,unknown> = { featuresType:type };
 if (type === "land") features.featuresAreaPlot = Number(p.land_area || p.area);
 else features.featuresAreaConstructed = Number(override.area ?? p.area);
 if (["flat","house","rustic_quinta"].includes(type)) {
  features.featuresBedroomNumber = override.bedrooms ?? p.beds; features.featuresBathroomNumber = p.baths;
  if (features.featuresBedroomNumber === 0) features.featuresStudio = true;
  if (p.area_util && Number(p.area_util)>0) features.featuresAreaUsable = Math.round(Number(p.area_util));
  if (p.land_area && Number(p.land_area)>0) features.featuresAreaPlot = Math.round(Number(p.land_area));
  if (p.garage != null) features.featuresParkingAvailable = p.garage;
  if (p.elevator != null) features.featuresLiftAvailable = p.elevator;
  if (p.accessible != null) features.featuresHandicapAdaptedAccess = p.accessible;
  if (["A+","A","B","B-","C","D","E","F","G","exempt","inProcess","unknown"].includes(p.energy)) features.featuresEnergyCertificateRating = p.energy;
  if (p.construction_year) features.featuresBuiltYear = p.construction_year;
 }
 const contact: Record<string,string> = {};
 if (p.agent?.name) contact.contactName = p.agent.name.slice(0,60);
 // Only public professional contact details; never seller details or documents.
 if (p.agent?.email) contact.contactEmail = p.agent.email;
 const phone = p.agent?.whatsapp?.replace(/\D/g,"");
 if (phone && /^351\d{9}$/.test(phone)) { contact.contactPrimaryPhonePrefix = "351"; contact.contactPrimaryPhoneNumber = phone.slice(3); }
 return {
  propertyCode: override.propertyCode || p.id,
  propertyReference: override.reference || p.legacy_reference || p.reference,
  propertyVisibility:"idealista",
  propertyUrl:`https://housepro.pt/imovel/${encodeURIComponent(p.id)}`,
  propertyAddress:{ addressCountry:"Portugal", addressTown:p.municipality.slice(0,50), addressVisibility:"hidden", addressCoordinatesPrecision:"moved", addressCoordinatesLatitude:p.latitude, addressCoordinatesLongitude:p.longitude },
  propertyOperation:{ operationType:p.operation === "arrendamento" ? "rent" : "sale", operationPrice:Number(p.price) },
  propertyFeatures:features,
  ...(Object.keys(contact).length ? {propertyContact:contact} : {}),
  propertyDescriptions:descriptions(p.description!),
  propertyImages:photos(p).map((url,i)=>({imageUrl:url,imageOrder:i+1})),
 };
}
export function buildFeed(listings: Listing[], config: FeedConfig) {
 const problems: {id:string; reference:string; errors:string[]}[] = [];
 const properties: ReturnType<typeof mapListing>[] = [];
 const developments: Record<string,unknown>[] = [];
 const selected = new Set(config.property_ids);
 for (const p of [...listings].sort((a,b)=>a.id.localeCompare(b.id))) {
  if (!selected.has(p.id) || !eligible(p)) continue;
  const override = config.overrides[p.id] ?? {};
  const errors = listingProblems(p,override);
  if (p.is_development && !config.development_service) errors.push("Serviço de empreendimentos do idealista não confirmado");
  if (errors.length) { problems.push({id:p.id,reference:p.reference,errors});continue; }
  const mapped = mapListing(p,override);
  if (p.is_development) {
   const {propertyOperation: _operation, propertyFeatures: _features, ...common} = mapped;
   void _operation; void _features;
   developments.push({...common,propertyForSale:p.operation === "venda",propertyForRent:p.operation === "arrendamento",propertyFeatures:{featuresType:"promo",featuresNewDevelopmentType:p.type === "Moradia" ? "house" : "new_building",featuresNewDevelopmentName:p.development_name,featuresFinished:p.development_stage === "pronto"},newDevelopmentTypologies:[mapped]});
  } else properties.push(mapped);
 }
 const codes = [...properties, ...developments].map(p => String(p.propertyCode));
 if(new Set(codes).size !== codes.length) problems.push({id:"account",reference:"Conta",errors:["Há códigos externos repetidos na seleção."]});
 const payload = { customerCountry:"Portugal", customerCode:config.customer_code, customerReference:"Helix-HousePro", customerProperties:properties, customerNewDevelopments:developments };
 const schemaErrors = validateFeed(payload);
 return {payload,problems,schemaErrors,count:properties.length + developments.length};
}
