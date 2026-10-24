import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isNetworkFinanceAdmin} from "@/lib/data/finance-access";
import {notifyGeneric} from "@/lib/notify";
async function permitted(){const s=await getSession();return s&&!s.demo&&isNetworkFinanceAdmin(s.agent)?s:null;}
export async function GET(){const s=await permitted();if(!s)return NextResponse.json({error:"Sem permissão."},{status:403});
 const {data,error}=await createAdminClient().rpc("get_email_delivery_config");if(error)return NextResponse.json({error:"Não foi possível ler a configuração."},{status:503});
 return NextResponse.json({config:data?{sender:String(data.sender??""),notifyEmail:String(data.notifyEmail??""),enabled:data.enabled===true,keyConfigured:data.keyConfigured===true,updatedAt:data.updatedAt??null}:{sender:process.env.LEAD_FROM_EMAIL||"",notifyEmail:process.env.LEAD_NOTIFY_EMAIL||"",enabled:Boolean(process.env.RESEND_API_KEY&&process.env.LEAD_FROM_EMAIL),keyConfigured:Boolean(process.env.RESEND_API_KEY)},testRecipient:s.agent.email??null,readOnly:Boolean(s.viewingAs)},{headers:{"cache-control":"no-store"}});
}
export async function PUT(request:Request){const s=await permitted();if(!s||s.viewingAs)return NextResponse.json({error:"Sem permissão para alterar."},{status:403});
 const b=await request.json().catch(()=>null);if(!b||typeof b.sender!=="string"||typeof b.enabled!=="boolean"||typeof b.notifyEmail!=="string"||(b.apiKey!=null&&typeof b.apiKey!=="string"))return NextResponse.json({error:"Configuração inválida."},{status:400});
 const {error}=await createAdminClient().rpc("set_email_delivery_config",{p_sender:b.sender.trim(),p_notify_email:b.notifyEmail.trim(),p_enabled:b.enabled,p_actor:s.agent.id,p_api_key:b.apiKey?.trim()||null});
 if(error)return NextResponse.json({error:"Não foi possível guardar. Verifique os endereços e a chave de envio."},{status:400});return NextResponse.json({ok:true});
}
export async function POST(){const s=await permitted();if(!s||s.viewingAs||!s.agent.email)return NextResponse.json({error:"Sem permissão ou e-mail da conta em falta."},{status:403});
 const channels=await notifyGeneric({subject:"Helix — teste de envio de e-mail",text:"Este é um teste de envio da configuração do Helix. Não contém dados de clientes.",to:[s.agent.email]});
 if(!channels.includes("email"))return NextResponse.json({error:"O envio não foi aceite. Confirme a chave de envio, a ativação e a verificação do domínio remetente no Resend."},{status:422});
 return NextResponse.json({ok:true,recipient:s.agent.email});
}
