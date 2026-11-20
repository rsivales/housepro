import { houseproEmail } from "@/lib/email-template";
import {emailDeliveryCredentials} from "./email-delivery";
export interface ResendTestResult {ok:boolean;code:string;message:string;id?:string;}
export async function sendResendConfigurationTest(recipient:string):Promise<ResendTestResult>{
 const c=await emailDeliveryCredentials();
 if(!c.enabled)return {ok:false,code:'disabled',message:'O envio está desativado. Guarde a configuração com o envio ativado.'};
 if(!c.apiKey)return {ok:false,code:'missing_key',message:'Falta guardar uma chave de envio Resend.'};
 if(!c.sender)return {ok:false,code:'missing_sender',message:'Falta definir o remetente no domínio validado.'};
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${c.apiKey}`,'content-type':'application/json'},body:JSON.stringify({from:c.sender,to:[recipient],...(c.notifyEmail?{reply_to:c.notifyEmail}:{}),html:houseproEmail('O seu Helix está ligado','A comunicação HousePro ganhou uma nova apresentação. Este email confirma a receção do teste enviado pela sua conta.'),subject:'Helix — teste de configuração Resend',text:'Teste do envio de e-mails do Helix. Não contém dados de clientes. Se recebeu esta mensagem, o serviço aceitou o envio a partir do remetente configurado.'}),signal:AbortSignal.timeout(10000)});
  const result=await r.json().catch(()=>({}));
  if(r.ok&&typeof result.id==='string')return {ok:true,code:'accepted',id:result.id,message:'Teste aceite pelo Resend. Confirme a receção na caixa de entrada ou no spam; a aceitação não confirma a entrega.'};
  const name=String(result.name??''),message=String(result.message??'').toLowerCase();
  if(r.status===401||name==='missing_api_key'||message.includes('api key is invalid'))return {ok:false,code:'invalid_key',message:'A chave não foi aceite pelo Resend. Crie uma chave de envio ativa na conta correta e guarde-a novamente.'};
  if(name==='restricted_api_key'||name==='suspended_api_key')return {ok:false,code:'restricted_key',message:'A chave está inativa, suspensa ou não permite este envio. Confirme a permissão Sending access e o domínio associado.'};
  if(r.status===403&&(message.includes('not verified')||message.includes('testing emails')))return {ok:false,code:'domain_not_verified',message:'O Resend exige a validação do domínio do remetente nesta conta. Confirme os registos DNS e use um endereço desse domínio.'};
  if(r.status===429)return {ok:false,code:'rate_limit',message:'O Resend atingiu um limite de envio. Aguarde e verifique os limites da conta.'};
  if(r.status===403)return {ok:false,code:'permission_denied',message:'O Resend recusou o envio. Confirme as permissões da chave, o domínio autorizado e o estado da conta.'};
  if(r.status===400||r.status===422)return {ok:false,code:'invalid_sender_or_address',message:'O Resend recusou os dados. Reveja o remetente e o e-mail da sua conta Helix.'};
  return {ok:false,code:'provider_unavailable',message:'O Resend não aceitou o teste. Tente novamente e consulte os registos de envio da conta.'};
 }catch{return {ok:false,code:'connection_failed',message:'Não foi possível contactar o Resend. A configuração ficou guardada; tente o teste novamente.'};}
}
