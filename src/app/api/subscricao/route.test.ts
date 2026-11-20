import { beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({hasRole:vi.fn(),admin:vi.fn(),credentials:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({hasServiceRole:mocks.hasRole,createAdminClient:mocks.admin}));
vi.mock("@/lib/email-delivery",()=>({emailDeliveryCredentials:mocks.credentials}));
import { POST } from "./route";
import { POST as confirm } from "./confirmar/route";
import { POST as cancel } from "./cancelar/route";

beforeEach(()=>{vi.resetAllMocks();mocks.hasRole.mockReturnValue(true);});
it("does not create a subscription without a selected topic and explicit consent",async()=>{
 const request=new Request("http://localhost/api/subscricao",{method:"POST",body:JSON.stringify({email:"owner@example.test",offers:true,news:false,consent:false})});
 expect((await POST(request)).status).toBe(422);
 expect(mocks.admin).not.toHaveBeenCalled();
});
it("rejects malformed confirmation and cancellation tokens before accessing the database",async()=>{
 const request=(url:string)=>new Request(url,{method:"POST",body:JSON.stringify({token:"invalid",action:"confirm"})});
 expect((await confirm(request("http://localhost/api/subscricao/confirmar"))).status).toBe(422);
 expect((await cancel(request("http://localhost/api/subscricao/cancelar"))).status).toBe(422);
 expect(mocks.admin).not.toHaveBeenCalled();
});
it("does not expose the subscription database without the service role",async()=>{
 mocks.hasRole.mockReturnValue(false);
 const response=await POST(new Request("http://localhost/api/subscricao",{method:"POST",body:JSON.stringify({email:"owner@example.test",offers:true,consent:true})}));
 expect(response.status).toBe(503);
 expect(mocks.admin).not.toHaveBeenCalled();
});
