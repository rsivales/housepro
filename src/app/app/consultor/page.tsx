import {redirect} from "next/navigation";
import {getSession} from "@/lib/supabase/auth";
import {isCommercialAgent} from "@/lib/data/agent-directory";
import {ConsultantHome} from "@/components/helix/consultant-home";
export const metadata={title:"A minha área de consultor — Helix"};
export default async function ConsultantWorkspace(){const s=await getSession();if(!s)redirect("/entrar");if(!isCommercialAgent(s.agent))redirect("/admin");return <ConsultantHome agent={s.agent} demo={s.demo}/>;}
