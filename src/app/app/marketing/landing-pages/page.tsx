import Link from "next/link";
import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {listProperties} from "@/lib/db/repo";
import {LandingEditor} from "@/components/marketing/landing-editor";
export const metadata={title:"Landing Pages · Marketing · Helix"};
export default async function LandingPages(){const session=await getSession();if(!session)redirect("/entrar");const properties=(await listProperties()).map(p=>({id:p.id,title:p.title,reference:p.reference,municipality:p.municipality,price:p.price,image:p.image}));return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6"><Link href="/app/menu" className="text-sm text-slate-500">← Marketing</Link><div><p className="text-xs font-bold uppercase tracking-widest text-[#c9192c]">Helix · Marketing</p><h1 className="mt-2 text-3xl font-bold text-[#11243d]">Landing Pages</h1><p className="mt-2 text-sm text-slate-600">Crie montras para campanhas com imóveis da carteira e acompanhe os resultados.</p></div><LandingEditor properties={properties} demo={session.demo}/></main>}
