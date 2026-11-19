import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {ProfessionalTools} from "@/components/tools/professional-tools";
export const metadata={title:"Ferramentas do consultor — Helix"};
export default async function ToolsPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const s=await getSession();if(!s)redirect('/entrar');const q=await searchParams;const initialTab=q.tab==='maisvalias'||q.tab==='credito'?q.tab:'imt';return <ProfessionalTools consultantRef={s.agent.id} readOnly={Boolean(s.demo||s.viewingAs)} initialTab={initialTab}/>;}
