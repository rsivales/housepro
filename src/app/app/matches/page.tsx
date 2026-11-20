import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { MatchesBoard } from "@/components/matching/matches-board";
export const metadata={title:"Correspondências · HousePro"};
export default async function MatchesPage(){const s=await getSession();if(!s)redirect("/entrar");return <main className="mx-auto max-w-5xl px-4 py-8"><h1 className="font-display text-3xl">Oportunidades na rede</h1><p className="mt-2 text-muted-foreground">Os seus compradores e imóveis, ligados aos consultores certos. Cada agente mantém a relação com o seu cliente.</p><MatchesBoard agentId={s.agent.id} readOnly={Boolean(s.viewingAs||s.demo)}/></main>;}
