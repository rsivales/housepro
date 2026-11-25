import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Landing = { id:string; slug:string; title:string; description:string; image_url:string|null; status:"draft"|"published"|"inactive"; property_ids:string[]; created_by:string; agency_id:string|null; created_at:string };

export async function publicLanding(slug:string):Promise<Landing|null> {
 if(!hasServiceRole()) return null;
 const {data,error}=await createAdminClient().from("marketing_landing_pages").select("*").eq("slug",slug).eq("status","published").maybeSingle();
 if(error) throw error;
 return data as Landing|null;
}
export async function landingProperties(ids:string[]) {
 if(!ids.length) return [];
 const db=await createClient();
 const {data,error}=await db.from("properties").select("id,title,reference,price,typology,area,beds,baths,municipality,cover_url,approval,listing_state,off_market,status").in("id",ids);
 if(error) throw error;
 return ids.map(id=>(data??[]).find(p=>p.id===id)).filter((p):p is NonNullable<typeof p>=>Boolean(p&&p.approval==="aprovado"&&p.listing_state==="activo"&&!p.off_market&&!['vendido','arrendado','cpcv'].includes(p.status)));
}
