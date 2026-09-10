import Link from "next/link";
import { listProperties, getPropertyHubConfig } from "@/lib/db/repo";
import { PropertyHubAdmin } from "@/components/admin/property-hub-admin";
import { propertyScores, selectMunicipalityWinner } from "@/lib/data/property-discovery";

export default async function PropertyHubAdminPage(){
 const [properties,config]=await Promise.all([listProperties(),getPropertyHubConfig()]);
 const municipalities=[...new Set(properties.map(p=>p.municipality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
 const agencies=[...new Map(properties.map(p=>[p.agent?.agencyId||p.agentId,{id:p.agent?.agencyId||p.agentId,name:p.agent?.agency||"Agência"}])).values()];
 const scores=propertyScores(properties);const tomorrow=new Date(Date.now()+86_400_000);const audit=municipalities.map(name=>{const winner=selectMunicipalityWinner(properties,name,config.rotation);const next=selectMunicipalityWinner(properties,name,config.rotation,tomorrow);const score=winner?scores.get(winner.id):undefined;return{name,currentAgency:winner?.agent?.agency||"—",nextAgency:next?.agent?.agency||"—",winner:winner?`${winner.reference} · ${winner.title}`:"Sem imóvel elegível",quality:score?.quality??0,priceMarket:score?.priceMarket??50}});
 return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/admin/website" className="text-sm text-primary">← Gestão do website</Link><h1 className="mt-3 font-display text-3xl">Página agregadora de imóveis</h1><p className="mt-2 text-sm text-muted-foreground">Conteúdo público, concelhos e regras editoriais. A rotação é automática e determinística.</p><PropertyHubAdmin initial={config} municipalities={municipalities} agencies={agencies} properties={properties.map(p=>({id:p.id,label:`${p.reference} · ${p.title}`}))} audit={audit}/></main>
}
