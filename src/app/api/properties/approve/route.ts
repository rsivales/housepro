import { PATCH as portfolioAction } from '@/app/api/properties/portfolio/route';
/** Preserve the existing approval UI while enforcing the real scoped action. */
export async function PATCH(request:Request){const b=await request.json().catch(()=>null);return portfolioAction(new Request(request.url,{method:'PATCH',headers:request.headers,body:JSON.stringify({ids:b?.id?[b.id]:[],action:b?.action,reason:b?.reason})}));}
