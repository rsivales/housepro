import {createAdminClient,hasServiceRole} from "@/lib/supabase/admin";
export interface EmailCredentials {apiKey?:string;sender?:string;notifyEmail?:string;enabled:boolean;}
export async function emailDeliveryCredentials():Promise<EmailCredentials>{
 const env:EmailCredentials={apiKey:process.env.RESEND_API_KEY,sender:process.env.LEAD_FROM_EMAIL,notifyEmail:process.env.LEAD_NOTIFY_EMAIL,enabled:Boolean(process.env.RESEND_API_KEY&&process.env.LEAD_FROM_EMAIL)};
 if(!hasServiceRole())return env;
 try{const {data,error}=await createAdminClient().rpc("get_email_delivery_credentials");if(error||!data)return env;
  return {apiKey:data.enabled?data.apiKey:undefined,sender:data.sender,notifyEmail:data.notifyEmail||undefined,enabled:data.enabled===true};
 }catch{return env;}
}
