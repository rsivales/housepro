import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isCommercialAgent} from "@/lib/data/agent-directory";
import {ProfessionalHome} from "@/components/helix/professional-home";
export const metadata={title:"A minha área de consultor — Helix"};
export default async function ConsultantWorkspace(){const s=await getSession();if(!s)redirect("/entrar");if(!isCommercialAgent(s.agent))redirect("/admin");return <ProfessionalHome agent={s.agent} demo={s.demo}/>;}
