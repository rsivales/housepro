import {NextResponse} from "next/server";
import {getSession} from "@/lib/supabase/auth";
import {POST as submitReport} from "../route";
export async function POST(request:Request){
 const s=await getSession();if(!s||s.demo||s.viewingAs)return NextResponse.json({error:"O envio exige uma sessão profissional real."},{status:401});
 const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Pedido inválido."},{status:400});
 const payload={...body,ref:s.agent.id,pageUrl:"https://housepro.pt/app/ferramentas?tab=maisvalias"};
 return submitReport(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify(payload)}));
}
