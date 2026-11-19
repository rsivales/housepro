import Link from "next/link";
import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {agencyWorkspaces} from "@/lib/db/agency-finance";
import {navigationAccess,navigationGroups} from "@/lib/helix/navigation";
export const metadata={title:"Todos os módulos — Helix"};
export default async function MenuPage(){const s=await getSession();if(!s)redirect("/entrar");const broker=!s.demo&&(await agencyWorkspaces(s.agent)).some(a=>a.brokerId===s.agent.id||(s.agent.roleKey==="diretor"&&a.id===s.agent.agencyId));const groups=navigationGroups(navigationAccess(s.agent,broker));return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"><h1 className="font-display text-3xl">Todos os módulos</h1><Link href="/app/pesquisa" className="block rounded-xl border bg-card p-4 text-muted-foreground">Pesquisar no Helix</Link><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{groups.map(g=><section key={g.label} className="overflow-hidden rounded-2xl border bg-card"><h2 className="border-b p-4 font-semibold">{g.label}</h2><nav className="p-2">{g.items.map(i=><Link key={i.href} href={i.href} className="block rounded-lg px-3 py-3 text-sm hover:bg-secondary">{i.label}</Link>)}</nav></section>)}</div></main>;}
