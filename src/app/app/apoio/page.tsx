import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {SupportBoard} from "@/components/support/support-board";
export const metadata={title:"Ajuda e tickets · Helix"};
export default async function SupportPage({searchParams}:{searchParams:Promise<{ticket?:string;lead?:string}>}){const s=await getSession();if(!s)redirect('/entrar');const p=await searchParams;return <main className="mx-auto max-w-6xl px-4 py-8"><h1 className="font-display text-3xl">Ajuda e tickets</h1><SupportBoard initialTicket={p.ticket} leadId={p.lead}/></main>;}
