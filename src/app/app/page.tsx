import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isCommercialAgent} from "@/lib/data/agent-directory";
import {ProfessionalHome} from "@/components/helix/professional-home";
export const metadata={title:"Início — Helix"};
export default async function AppPage(){const s=await getSession();if(!s)redirect("/entrar");if(s.agent.roleKey==="advogado")redirect("/app/legalflow");if(!isCommercialAgent(s.agent))redirect("/admin");return <ProfessionalHome agent={s.agent} demo={s.demo}/>;}
