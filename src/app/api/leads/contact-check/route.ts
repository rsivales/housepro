import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
/** The browser cannot set deadlines or trigger reassignment/quality penalties. */
export async function POST(){const s=await getSession();if(!s||s.viewingAs)return NextResponse.json({error:"Sessão inválida."},{status:403});if(s.demo)return NextResponse.json({ok:true,outcomes:[]});const {data,error}=await createAdminClient().rpc('check_my_lead_followups',{p_actor:s.agent.id});if(error)return NextResponse.json({error:"Não foi possível verificar o acompanhamento."},{status:503});return NextResponse.json({ok:true,outcomes:data??[],policy:'human_review'});}
